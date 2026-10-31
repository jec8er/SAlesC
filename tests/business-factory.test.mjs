import test from "node:test";
import assert from "node:assert/strict";
import {
  createMission,
  startTask,
  submitArtifact,
  reviewTask,
  missionSummary,
} from "../lib/business-factory.mjs";

test("commercial mission starts with research only and blocks dependencies", () => {
  const m = createMission({
    id: "pilot_1",
    goal: "Create an original storefront offer",
    customer: "Local merchants",
    maxCostCents: 600,
    maxMinutes: 120,
  });
  assert.equal(m.tasks.length, 7);
  assert.deepEqual(
    m.tasks.filter((t) => t.status === "ready").map((t) => t.id),
    ["research"],
  );
  assert.throws(() => startTask(m, "offer", 0), /not ready/);
  assert.throws(() => startTask(m, "research", 1), /Stale/);
});
test("U.S. policy review blocks quality and launch until human approval", () => {
  let m = createMission({
    id: "pilot_policy",
    goal: "Validate a U.S. offer",
    customer: "California merchants",
    maxCostCents: 700,
    maxMinutes: 140,
    targetState: "CA",
  });
  assert.equal(m.targetState, "CA");
  assert.equal(missionSummary(m).launchBlocked, true);

  m = startTask(m, "research", m.revision);
  m = submitArtifact(
    m,
    "research",
    {
      kind: "market-evidence",
      summary: "Consented customer interview",
      evidence: ["interview:case-1"],
    },
    m.revision,
  );
  m = reviewTask(
    m,
    "research",
    { approved: true, note: "Evidence verified" },
    m.revision,
  );
  m = startTask(m, "offer", m.revision);
  m = submitArtifact(
    m,
    "offer",
    { kind: "offer-draft", summary: "Bounded offer" },
    m.revision,
  );
  m = reviewTask(
    m,
    "offer",
    { approved: true, note: "Offer verified" },
    m.revision,
  );
  assert.equal(m.tasks.find((t) => t.id === "policy").status, "ready");
  assert.equal(m.tasks.find((t) => t.id === "quality").status, "pending");

  m = startTask(m, "policy", m.revision);
  const policyReview = {
    reviewerName: "Jane Counsel",
    reviewerRole: "licensed-attorney",
    reviewedAt: "2026-10-31T12:00:00.000Z",
    completedDocuments: [...m.policyGate.requiredDocuments],
    completedControls: [...m.policyGate.requiredControls],
    resolvedBlockers: [...m.policyGate.hardBlockers],
  };
  m = submitArtifact(
    m,
    "policy",
    {
      kind: "us-policy-review",
      summary: "California review complete",
      policyReview,
    },
    m.revision,
  );
  assert.throws(
    () =>
      reviewTask(m, "policy", { approved: true, note: "Reviewed" }, m.revision),
    /linked evidence/,
  );
  m = reviewTask(
    {
      ...m,
      tasks: m.tasks.map((task) =>
        task.id === "policy"
          ? {
              ...task,
              artifact: { ...task.artifact, evidence: ["counsel:review-1"] },
            }
          : task,
      ),
    },
    "policy",
    { approved: true, note: "State addendum reviewed" },
    m.revision,
  );
  assert.equal(
    missionSummary(m).launchBlockers.includes("us-policy-review-not-approved"),
    false,
  );
  assert.equal(
    missionSummary(m).launchBlockers.includes("mission-workflow-not-complete"),
    true,
  );
});
test("specialized blockers require explicit attorney-backed resolution", () => {
  let m = createMission({
    id: "pilot_advice",
    goal: "Evaluate an advisory offer",
    customer: "Texas investors",
    targetState: "TX",
    activity: "investment-advice",
  });
  m = {
    ...m,
    tasks: m.tasks.map((task) =>
      task.id === "policy" ? { ...task, status: "running" } : task,
    ),
  };
  const baseReview = {
    reviewerName: "Jane Counsel",
    reviewerRole: "licensed-attorney",
    reviewedAt: "2026-10-31T12:00:00.000Z",
    completedDocuments: [...m.policyGate.requiredDocuments],
    completedControls: [...m.policyGate.requiredControls],
    resolvedBlockers: [],
  };
  m = submitArtifact(
    m,
    "policy",
    {
      kind: "us-policy-review",
      summary: "Registration analysis attached",
      evidence: ["legal-memo:registration-1"],
      policyReview: baseReview,
    },
    m.revision,
  );
  assert.throws(
    () =>
      reviewTask(
        m,
        "policy",
        { approved: true, note: "Counsel reviewed" },
        m.revision,
      ),
    /unresolved specialized-review blockers/,
  );
  const blocker = m.policyGate.hardBlockers[0];
  m = {
    ...m,
    tasks: m.tasks.map((task) =>
      task.id === "policy"
        ? {
            ...task,
            artifact: {
              ...task.artifact,
              policyReview: {
                ...task.artifact.policyReview,
                resolvedBlockers: [blocker],
              },
            },
          }
        : task,
    ),
  };
  m = reviewTask(
    m,
    "policy",
    { approved: true, note: "Registration obligation resolved" },
    m.revision,
  );
  assert.equal(
    m.tasks.find((task) => task.id === "policy").status,
    "completed",
  );
  assert.equal(missionSummary(m).launchBlockers.includes(blocker), false);
});
test("evidence and owner review unlock dependent tasks without external effects", () => {
  let m = createMission({
    id: "pilot_2",
    goal: "Test a service",
    customer: "Shops",
    maxCostCents: 600,
    maxMinutes: 120,
  });
  m = startTask(m, "research", m.revision);
  assert.throws(
    () =>
      submitArtifact(
        m,
        "research",
        { kind: "wrong", summary: "Findings" },
        m.revision,
      ),
    /Wrong artifact/,
  );
  m = submitArtifact(
    m,
    "research",
    {
      kind: "market-evidence",
      summary: "Two local buyers interviewed",
      evidence: ["interview:consented-case-1"],
      costCents: 20,
      minutes: 2,
    },
    m.revision,
  );
  assert.equal(m.tasks.find((t) => t.id === "offer").status, "pending");
  m = reviewTask(
    m,
    "research",
    { approved: true, note: "Evidence checked" },
    m.revision,
  );
  assert.equal(m.tasks.find((t) => t.id === "offer").status, "ready");
  assert.equal(missionSummary(m).spentCostCents, 20);
  assert.equal(m.events.length, 3);
});
test("research without evidence cannot be approved", () => {
  let m = createMission({
    id: "pilot_3",
    goal: "Research market",
    customer: "Local service",
    maxCostCents: 600,
    maxMinutes: 120,
  });
  m = startTask(m, "research", m.revision);
  m = submitArtifact(
    m,
    "research",
    { kind: "market-evidence", summary: "No sources yet" },
    m.revision,
  );
  assert.throws(
    () =>
      reviewTask(
        m,
        "research",
        { approved: true, note: "Looks good" },
        m.revision,
      ),
    /linked evidence/,
  );
  m = reviewTask(
    m,
    "research",
    { approved: false, note: "Need sources" },
    m.revision,
  );
  assert.equal(m.tasks[0].status, "blocked");
});
test("task budgets prevent uncontrolled execution", () => {
  let m = createMission({
    id: "pilot_4",
    goal: "Research market",
    customer: "Local service",
    maxCostCents: 60,
    maxMinutes: 12,
  });
  m = startTask(m, "research", m.revision);
  assert.throws(
    () =>
      submitArtifact(
        m,
        "research",
        { kind: "market-evidence", summary: "Research", costCents: 11 },
        m.revision,
      ),
    /budget exceeded/i,
  );
  assert.throws(
    () =>
      submitArtifact(
        m,
        "research",
        { kind: "market-evidence", summary: "Research", minutes: 3 },
        m.revision,
      ),
    /budget exceeded/i,
  );
});
