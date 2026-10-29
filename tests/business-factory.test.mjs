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
  assert.equal(m.tasks.length, 6);
  assert.deepEqual(
    m.tasks.filter((t) => t.status === "ready").map((t) => t.id),
    ["research"],
  );
  assert.throws(() => startTask(m, "offer", 0), /not ready/);
  assert.throws(() => startTask(m, "research", 1), /Stale/);
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
