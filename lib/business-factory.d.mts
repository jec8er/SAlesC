export type BusinessTask = {
  id: string;
  department: string;
  dependsOn: string[];
  expectedArtifact: string;
  maxCostCents: number;
  maxMinutes: number;
  actualCostCents: number;
  actualMinutes: number;
  status:
    | "pending"
    | "ready"
    | "running"
    | "review"
    | "completed"
    | "blocked"
    | "failed";
  artifact: null | { kind: string; summary: string; evidence: string[] };
  approval: null | { approved: boolean; note: string };
};
export type BusinessMission = {
  id: string;
  goal: string;
  customer: string;
  maxCostCents: number;
  maxMinutes: number;
  revision: number;
  tasks: BusinessTask[];
  events: { action: string; taskId: string; revision: number }[];
};
export function createMission(options: {
  id: string;
  goal: string;
  customer: string;
  maxCostCents?: number;
  maxMinutes?: number;
}): BusinessMission;
export function startTask(
  mission: BusinessMission,
  taskId: string,
  expectedRevision: number,
): BusinessMission;
export function submitArtifact(
  mission: BusinessMission,
  taskId: string,
  artifact: {
    kind: string;
    summary: string;
    evidence?: string[];
    costCents?: number;
    minutes?: number;
  },
  expectedRevision: number,
): BusinessMission;
export function reviewTask(
  mission: BusinessMission,
  taskId: string,
  decision: { approved: boolean; note: string },
  expectedRevision: number,
): BusinessMission;
export function missionSummary(mission: BusinessMission): {
  id: string;
  revision: number;
  counts: Record<string, number>;
  spentCostCents: number;
  spentMinutes: number;
  finished: boolean;
};
