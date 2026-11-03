export type TrustStatus = "verified" | "owner_action" | "professional_review";
export type TrustControl = {
  id: string;
  category: "privacy" | "fairness" | "accessibility" | "security" | "business";
  title: string;
  status: TrustStatus;
  evidence: string;
};

// This registry is intentionally conservative. "Verified" means the named
// repository evidence exists; it never means that a lawyer or auditor approved
// the product or that ORBIT complies with every law in every jurisdiction.
export const trustControls: readonly TrustControl[] = [
  {
    id: "privacy-policy",
    category: "privacy",
    title: "Publish a reviewed privacy policy",
    status: "professional_review",
    evidence:
      "docs/policies.md contains an English draft; operator details, data inventory and professional review remain pending before customer collection.",
  },
  {
    id: "terms",
    category: "business",
    title: "Publish reviewed terms of service",
    status: "professional_review",
    evidence:
      "docs/policies.md documents proposed scope and acceptable use; operator identity, customer orders and dispute terms still need owner and counsel review.",
  },
  {
    id: "refunds",
    category: "business",
    title: "Define refund and cancellation rules",
    status: "owner_action",
    evidence:
      "docs/policies.md proposes cancellation and unearned-fee refunds; owner approval and a tested subscription cancellation process remain pending.",
  },
  {
    id: "cookies",
    category: "privacy",
    title: "Inventory cookies and tracking",
    status: "verified",
    evidence:
      "server/app.ts sets one essential HttpOnly SameSite=Strict session cookie; no analytics SDK is installed.",
  },
  {
    id: "cookie-consent",
    category: "privacy",
    title: "Add consent when non-essential tracking is introduced",
    status: "verified",
    evidence:
      "No non-essential cookie or tracker exists in the current runtime; re-open this control before adding one.",
  },
  {
    id: "form-consent",
    category: "privacy",
    title: "Use specific consent at collection points",
    status: "owner_action",
    evidence:
      "Add purpose-specific consent before adding public lead, marketing or sensitive-data forms.",
  },
  {
    id: "minimization",
    category: "privacy",
    title: "Minimize stored data",
    status: "verified",
    evidence:
      "lib/domain.ts uses strict bounded schemas and rejects unknown persisted fields.",
  },
  {
    id: "vendors",
    category: "privacy",
    title: "Audit third-party SDKs and vendors",
    status: "owner_action",
    evidence:
      "Stripe is installed and checkout/webhooks exist. Inventory deployed billing data, infrastructure and any external inference adapter before launch; SDK absence does not establish absence of data transfers.",
  },
  {
    id: "dark-patterns",
    category: "fairness",
    title: "Avoid dark patterns",
    status: "owner_action",
    evidence:
      "src/App.tsx exposes subscription checkout when configured. Verify full price and renewal disclosures, affirmative agreement and a working cancellation path before activation.",
  },
  {
    id: "fees",
    category: "fairness",
    title: "Disclose every fee before payment",
    status: "owner_action",
    evidence:
      "Pricing is labeled as a hypothesis. Add a complete order summary before enabling payments.",
  },
  {
    id: "reviews",
    category: "fairness",
    title: "Use only authentic reviews",
    status: "verified",
    evidence: "The product contains no testimonial or review surface.",
  },
  {
    id: "claims",
    category: "fairness",
    title: "Support product and performance claims",
    status: "verified",
    evidence:
      "UI and README distinguish modeled P&L, historical tests and real revenue; no guaranteed-return claim is made.",
  },
  {
    id: "alt-text",
    category: "accessibility",
    title: "Provide text alternatives",
    status: "owner_action",
    evidence:
      "Run a complete screen-reader review before public launch; decorative icons alone are not sufficient evidence.",
  },
  {
    id: "contrast",
    category: "accessibility",
    title: "Verify color contrast",
    status: "professional_review",
    evidence:
      "Automated and manual WCAG 2.2 AA contrast testing has not been recorded.",
  },
  {
    id: "keyboard",
    category: "accessibility",
    title: "Verify keyboard navigation and focus",
    status: "owner_action",
    evidence:
      "Visible focus styles exist, but the complete authenticated workflow needs a keyboard-only test.",
  },
  {
    id: "business-details",
    category: "business",
    title: "Publish legal business and contact details",
    status: "owner_action",
    evidence:
      "A public operator identity and support contact have not been configured.",
  },
  {
    id: "children",
    category: "privacy",
    title: "Define age eligibility and children's-data handling",
    status: "professional_review",
    evidence:
      "ORBIT is not designed for children, but public terms must state eligibility before launch.",
  },
  {
    id: "data-rights",
    category: "privacy",
    title: "Document export, correction and deletion",
    status: "owner_action",
    evidence:
      "Workspace export exists; docs/policies.md describes request and retention requirements. Monitored contacts, deadlines assessment and complete deletion/backup procedures remain pending.",
  },
  {
    id: "headers",
    category: "security",
    title: "Enforce browser security boundaries",
    status: "verified",
    evidence:
      "CSP, HSTS in production, frame denial, MIME protection, origin checks and restrictive Permissions-Policy are server enforced.",
  },
  {
    id: "incident-response",
    category: "security",
    title: "Create an incident-response and breach plan",
    status: "owner_action",
    evidence:
      "docs/policies.md contains a draft incident procedure; incident contacts, notification assessment and recovery drills must be completed for the deployed service.",
  },
] as const;

export function trustSummary(
  controls: readonly TrustControl[] = trustControls,
) {
  const verified = controls.filter(
    (control) => control.status === "verified",
  ).length;
  const ownerAction = controls.filter(
    (control) => control.status === "owner_action",
  ).length;
  const professionalReview = controls.filter(
    (control) => control.status === "professional_review",
  ).length;
  return {
    total: controls.length,
    verified,
    ownerAction,
    professionalReview,
    launchReady: ownerAction === 0 && professionalReview === 0,
  };
}
