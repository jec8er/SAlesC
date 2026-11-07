import type { DatabaseSync } from "node:sqlite";
import type { EcomodaInference } from "../lib/ecomoda-core.mjs";
import type { EcomodaFileStore } from "../lib/ecomoda-file-store.mjs";
export function createServiceWorker(config: {
  db: DatabaseSync;
  infer?: EcomodaInference;
  store?: EcomodaFileStore;
  now?: () => number;
  timeoutMs?: number;
}): {
  enqueue(id: string, brief: string): unknown;
  inspect(id: string): unknown;
  tick(): Promise<{ status: string; id?: string }>;
  summary(): unknown;
  start(): void;
  stop(): Promise<void>;
};
