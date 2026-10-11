import type { EcomodaFileStore } from "./ecomoda-file-store.mjs";

export type EcomodaRole = "Betty" | "Hugo" | "Marcela";
export type EcomodaInference = (request: {
  role: EcomodaRole;
  instructions: string;
  input: string;
  signal?: AbortSignal;
}) => Promise<string>;
export type EcomodaCycleResult = {
  id: string;
  status: "skipped" | "awaiting_artifact_validation" | "revision_required";
  publishAllowed?: false;
  verifiedRevenue?: null;
};
export function runCycle(input: {
  id: string;
  task: string;
  infer: EcomodaInference;
  store: EcomodaFileStore;
  signal?: AbortSignal;
}): Promise<EcomodaCycleResult>;
