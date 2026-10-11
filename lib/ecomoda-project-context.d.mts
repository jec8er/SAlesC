import type { ProjectMemory } from "./ecomoda-project-memory.mjs";

export type ProjectInferenceContext = {
  schemaVersion: 1;
  preferences: Array<{
    area: ProjectMemory["preferences"][number]["area"];
    key: string;
    value: string;
    updatedAt: string;
  }>;
  verifiedState: Array<{
    kind: ProjectMemory["verifiedState"][number]["kind"];
    statement: string;
    observedAt: string;
  }>;
  nextActions: Array<{
    id: string;
    action: string;
    status: Exclude<ProjectMemory["nextActions"][number]["status"], "done">;
    updatedAt: string;
  }>;
};

export const projectContextLimits: Readonly<{
  preferences: number;
  verifiedState: number;
  nextActions: number;
  characters: number;
}>;
export function buildProjectContext(input: unknown): ProjectInferenceContext;
