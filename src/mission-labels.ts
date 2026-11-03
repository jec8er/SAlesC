const blockers: Record<string, string> = {
  "us-policy-review-not-approved": "Policy review is still pending.",
  "mission-workflow-not-complete":
    "Complete and review the remaining mission tasks.",
  "legacy-mission-missing-us-policy-gate":
    "Create a new mission with a jurisdiction review.",
  "coppa-parental-consent-and-counsel-review":
    "Children's privacy requires specialized review.",
  "investment-adviser-counsel-and-registration-review":
    "Investment advice requires specialized review.",
};
export function blockerLabel(code: string) {
  return blockers[code] ?? "Additional review is pending.";
}
