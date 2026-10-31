/**
 * ORBIT Business Factory V1.
 * Deterministic, side-effect-free mission planning and execution ledger.
 * No model calls, outreach, publication, payment or trading routes.
 */
import { createUsPolicyGate } from "./us-policy.mjs";

export const DEPARTMENTS = Object.freeze([
  "research",
  "builder",
  "sales",
  "content",
  "finance",
  "quality",
]);
export const STATUSES = Object.freeze([
  "pending",
  "ready",
  "running",
  "review",
  "completed",
  "blocked",
  "failed",
]);
const TEMPLATES = Object.freeze([
  {
    id: "research",
    department: "research",
    dependsOn: [],
    artifact: "market-evidence",
  },
  {
    id: "offer",
    department: "builder",
    dependsOn: ["research"],
    artifact: "offer-draft",
  },
  {
    id: "economics",
    department: "finance",
    dependsOn: ["offer"],
    artifact: "unit-economics",
  },
  {
    id: "policy",
    department: "quality",
    dependsOn: ["offer"],
    artifact: "us-policy-review",
  },
  {
    id: "quality",
    department: "quality",
    dependsOn: ["offer", "economics", "policy"],
    artifact: "quality-report",
  },
  {
    id: "sales",
    department: "sales",
    dependsOn: ["quality"],
    artifact: "outreach-draft",
  },
  {
    id: "content",
    department: "content",
    dependsOn: ["quality"],
    artifact: "content-draft",
  },
]);
const MAX_TEXT = 2000;
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function cleanText(value, field) {
  assert(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= MAX_TEXT,
    `Invalid ${field}`,
  );
  return value.trim();
}
function budget(value, field) {
  assert(
    Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000,
    `Invalid ${field}`,
  );
  return value;
}
function nextStatus(task, tasks) {
  if (task.status !== "pending") return task.status;
  if (
    task.dependsOn.every(
      (id) => tasks.find((t) => t.id === id)?.status === "completed",
    )
  )
    return "ready";
  return "pending";
}
function evolve(mission, tasks, event) {
  return {
    ...mission,
    revision: mission.revision + 1,
    tasks: tasks.map((t) => ({ ...t, status: nextStatus(t, tasks) })),
    events: [...mission.events, event],
  };
}
function taskById(mission, id) {
  const task = mission.tasks.find((t) => t.id === id);
  assert(task, "Unknown task");
  return task;
}
function replace(mission, id, patch, action) {
  const tasks = mission.tasks.map((t) =>
    t.id === id ? { ...t, ...patch } : t,
  );
  return evolve(mission, tasks, {
    action,
    taskId: id,
    revision: mission.revision + 1,
  });
}
export function createMission({
  id,
  goal,
  customer,
  maxCostCents = 0,
  maxMinutes = 120,
  targetState = "NY",
  activity = "general-commerce",
  sellsOrSharesPersonalData = false,
  usesAutomatedDecisions = true,
}) {
  id = cleanText(id, "mission id");
  assert(/^[a-zA-Z0-9_-]{1,80}$/.test(id), "Invalid mission id");
  goal = cleanText(goal, "goal");
  customer = cleanText(customer, "customer");
  budget(maxCostCents, "maxCostCents");
  budget(maxMinutes, "maxMinutes");
  const policyGate = createUsPolicyGate({
    stateCode: targetState,
    activity,
    sellsOrSharesPersonalData,
    usesAutomatedDecisions,
  });
  const allocations = TEMPLATES.map((t) => ({
    ...t,
    maxCostCents: Math.floor(maxCostCents / TEMPLATES.length),
    maxMinutes: Math.floor(maxMinutes / TEMPLATES.length),
    actualCostCents: 0,
    actualMinutes: 0,
    status: t.dependsOn.length ? "pending" : "ready",
    artifact: null,
    approval: null,
    expectedArtifact: t.artifact,
  }));
  return {
    id,
    goal,
    customer,
    targetState: policyGate.stateCode,
    policyGate,
    maxCostCents,
    maxMinutes,
    revision: 0,
    tasks: allocations,
    events: [],
  };
}
export function startTask(mission, id, expectedRevision) {
  assert(mission.revision === expectedRevision, "Stale mission revision");
  const task = taskById(mission, id);
  assert(task.status === "ready", "Task is not ready");
  return replace(mission, id, { status: "running" }, "start");
}
export function submitArtifact(
  mission,
  id,
  { kind, summary, evidence = [], costCents = 0, minutes = 0 },
  expectedRevision,
) {
  assert(mission.revision === expectedRevision, "Stale mission revision");
  const task = taskById(mission, id);
  assert(task.status === "running", "Task is not running");
  assert(kind === task.expectedArtifact, "Wrong artifact type");
  summary = cleanText(summary, "artifact summary");
  assert(
    Array.isArray(evidence) &&
      evidence.length <= 20 &&
      evidence.every(
        (x) => typeof x === "string" && x.length > 0 && x.length <= 2000,
      ),
    "Invalid evidence",
  );
  budget(costCents, "costCents");
  budget(minutes, "minutes");
  const spentCost = mission.tasks.reduce((n, t) => n + t.actualCostCents, 0);
  const spentMinutes = mission.tasks.reduce((n, t) => n + t.actualMinutes, 0);
  assert(
    costCents <= task.maxCostCents && minutes <= task.maxMinutes,
    "Task budget exceeded",
  );
  assert(
    costCents + spentCost <= mission.maxCostCents &&
      minutes + spentMinutes <= mission.maxMinutes,
    "Mission budget exceeded",
  );
  return replace(
    mission,
    id,
    {
      status: "review",
      actualCostCents: costCents,
      actualMinutes: minutes,
      artifact: { kind, summary, evidence: [...evidence] },
    },
    "submit",
  );
}
export function reviewTask(mission, id, { approved, note }, expectedRevision) {
  assert(mission.revision === expectedRevision, "Stale mission revision");
  const task = taskById(mission, id);
  assert(task.status === "review", "Task not awaiting review");
  assert(typeof approved === "boolean", "Review decision must be boolean");
  note = cleanText(note, "review note");
  if (id === "research" && approved)
    assert(
      task.artifact.evidence.length > 0,
      "Research requires linked evidence",
    );
  if (id === "policy" && approved) {
    assert(
      task.artifact.evidence.length > 0,
      "Policy review requires linked evidence",
    );
    assert(
      mission.policyGate?.hardBlockers?.length === 0,
      "Policy has unresolved specialized-review blockers",
    );
  }
  return replace(
    mission,
    id,
    {
      status: approved ? "completed" : "blocked",
      approval: { approved, note },
    },
    "review",
  );
}
export function missionSummary(mission) {
  const counts = Object.fromEntries(
    STATUSES.map((s) => [
      s,
      mission.tasks.filter((t) => t.status === s).length,
    ]),
  );
  const policyTask = mission.tasks.find((task) => task.id === "policy");
  const hardBlockers = mission.policyGate?.hardBlockers || [
    "legacy-mission-missing-us-policy-gate",
  ];
  const policyApproved = policyTask?.status === "completed";
  const finished = counts.completed === mission.tasks.length;
  const launchBlockers = [
    ...hardBlockers,
    ...(policyApproved ? [] : ["us-policy-review-not-approved"]),
    ...(finished ? [] : ["mission-workflow-not-complete"]),
  ];
  return {
    id: mission.id,
    revision: mission.revision,
    counts,
    spentCostCents: mission.tasks.reduce((n, t) => n + t.actualCostCents, 0),
    spentMinutes: mission.tasks.reduce((n, t) => n + t.actualMinutes, 0),
    finished,
    launchBlocked: launchBlockers.length > 0,
    launchBlockers: [...new Set(launchBlockers)],
  };
}
