export type UsJurisdiction = { code: string; name: string };
export type UsActivity =
  | "general-commerce"
  | "financial-education"
  | "investment-advice"
  | "children-directed";
export type UsPolicyGate = {
  country: "US";
  stateCode: string;
  jurisdictionName: string;
  activity: UsActivity;
  legalReviewRequired: true;
  requiredDocuments: string[];
  requiredControls: string[];
  hardBlockers: string[];
  disclaimer: string;
};
export const US_JURISDICTIONS: readonly UsJurisdiction[];
export const US_ACTIVITY_TYPES: readonly UsActivity[];
export const FEDERAL_POLICY_SOURCES: readonly {
  authority: string;
  topic: string;
  url: string;
}[];
export function jurisdictionByCode(code: string): UsJurisdiction | null;
export function createUsPolicyGate(options?: {
  stateCode?: string;
  activity?: UsActivity;
  sellsOrSharesPersonalData?: boolean;
  usesAutomatedDecisions?: boolean;
}): UsPolicyGate;
