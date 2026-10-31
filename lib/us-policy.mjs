/**
 * Deterministic U.S. policy-readiness metadata.
 * This module is a launch gate and document checklist, not legal advice.
 */
export const US_JURISDICTIONS = Object.freeze(
  [
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["DC", "District of Columbia"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
  ].map(([code, name]) => Object.freeze({ code, name })),
);

export const US_ACTIVITY_TYPES = Object.freeze([
  "general-commerce",
  "financial-education",
  "investment-advice",
  "children-directed",
]);

export const FEDERAL_POLICY_SOURCES = Object.freeze([
  {
    authority: "Federal Trade Commission",
    topic: "Privacy and data security",
    url: "https://www.ftc.gov/business-guidance/privacy-security",
  },
  {
    authority: "Federal Trade Commission",
    topic: "Advertising and marketing",
    url: "https://www.ftc.gov/business-guidance/resources/advertising-marketing-internet-rules-road",
  },
  {
    authority: "Federal Trade Commission",
    topic: "Children's privacy (COPPA)",
    url: "https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions",
  },
  {
    authority: "U.S. Securities and Exchange Commission",
    topic: "Investment adviser registration",
    url: "https://www.investor.gov/introduction-investing/investing-basics/glossary/investment-adviser-registration",
  },
]);

const BASE_DOCUMENTS = Object.freeze([
  "privacy-notice",
  "terms-of-service",
  "acceptable-use-policy",
  "ai-disclosure",
  "refund-and-cancellation-policy",
  "data-retention-and-security-plan",
  "state-privacy-addendum",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function jurisdictionByCode(code) {
  return US_JURISDICTIONS.find((item) => item.code === code) || null;
}

export function createUsPolicyGate({
  stateCode = "NY",
  activity = "general-commerce",
  sellsOrSharesPersonalData = false,
  usesAutomatedDecisions = true,
} = {}) {
  const jurisdiction = jurisdictionByCode(stateCode);
  assert(jurisdiction, "Invalid U.S. jurisdiction");
  assert(US_ACTIVITY_TYPES.includes(activity), "Invalid business activity");
  assert(
    typeof sellsOrSharesPersonalData === "boolean",
    "Invalid personal-data flag",
  );
  assert(
    typeof usesAutomatedDecisions === "boolean",
    "Invalid automated-decision flag",
  );

  const requiredDocuments = [...BASE_DOCUMENTS];
  const requiredControls = [
    "document-data-inventory",
    "publish-privacy-request-channel",
    "record-consent-and-policy-versions",
    "verify-advertising-claims",
    "define-incident-response-owner",
    "obtain-state-specific-legal-review",
  ];
  const hardBlockers = [];

  if (usesAutomatedDecisions) {
    requiredDocuments.push("automated-decision-disclosure");
    requiredControls.push("human-review-and-appeal-path");
  }
  if (sellsOrSharesPersonalData) {
    requiredDocuments.push("sale-sharing-opt-out-notice");
    requiredControls.push("honor-opt-out-and-preference-signals");
  }
  if (activity === "financial-education") {
    requiredDocuments.push("financial-education-disclaimer");
    requiredControls.push("prohibit-personalized-investment-advice");
  }
  if (activity === "investment-advice") {
    requiredDocuments.push("investment-advisory-disclosure");
    hardBlockers.push("investment-adviser-counsel-and-registration-review");
  }
  if (activity === "children-directed") {
    requiredDocuments.push("child-privacy-notice");
    hardBlockers.push("coppa-parental-consent-and-counsel-review");
  }

  return {
    country: "US",
    stateCode: jurisdiction.code,
    jurisdictionName: jurisdiction.name,
    activity,
    legalReviewRequired: true,
    requiredDocuments: [...new Set(requiredDocuments)],
    requiredControls: [...new Set(requiredControls)],
    hardBlockers,
    disclaimer:
      "Operational readiness checklist only; it is not legal advice or a guarantee of compliance.",
  };
}
