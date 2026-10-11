export type EcomodaTaskSummary = {
  exists: boolean;
  status: "missing" | "active" | "checkpointed" | "retryable_failure" | "completed";
  checkpointCount: number;
  updatedAt?: string | null;
  resultStatus?: string | null;
};
export type EcomodaFileStore = {
  claim(id: string, task: string): Promise<boolean>;
  append(id: string, event: unknown): Promise<void>;
  checkpoints(id: string): Promise<unknown[]>;
  inspect(id: string): Promise<EcomodaTaskSummary>;
  finish(id: string, result: unknown): Promise<void>;
  release(id: string): Promise<void>;
};
export function createFileStore(directory: string): EcomodaFileStore;
