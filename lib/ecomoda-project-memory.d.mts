export type ProjectPreference = {
  area: "creative" | "quality" | "publishing" | "operations" | "commercial";
  key: string;
  value: string;
  updatedAt: string;
};
export type VerifiedProjectState = {
  kind: "artifact" | "publication" | "quality" | "analytics" | "operation";
  statement: string;
  evidenceRef: string;
  observedAt: string;
};
export type ProjectNextAction = {
  id: string;
  action: string;
  status: "pending" | "in_progress" | "blocked" | "done";
  updatedAt: string;
};
export type ProjectMemory = {
  schemaVersion: 1;
  preferences: ProjectPreference[];
  verifiedState: VerifiedProjectState[];
  nextActions: ProjectNextAction[];
};
export type ProjectMemoryRecord = { revision: number; memory: ProjectMemory };
export type ProjectMemoryStore = {
  read(projectId: string): Promise<ProjectMemoryRecord>;
  update(projectId: string, memory: ProjectMemory, expectedRevision: number): Promise<ProjectMemoryRecord>;
};
export function validateProjectMemory(input: unknown): ProjectMemory;
export function createProjectMemoryStore(directory: string): ProjectMemoryStore;
