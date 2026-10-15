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
    evidence: "Required before collecting data from customers.",
  },
  {
    id: "terms",
    category: "business",
    title: "Publish reviewed terms of service",
    status: "professional_review",
    evidence:
      "Product scope, acceptable use and dispute terms need owner and counsel input.",
  },
  {
    id: "refunds",
    category: "business",
    title: "Define refund and cancellation rules",
    status: "owner_action",
    evidence: "Required before activating a paid offer or checkout.",
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
    status: "verified",
    evidence:
      "Runtime dependencies are Express, React, Lucide and Zod; no advertising, analytics, broker or hosted-model SDK is present.",
  },
  {
    id: "dark-patterns",
    category: "fairness",
    title: "Avoid dark patterns",
    status: "verified",
    evidence:
      "No checkout, subscription enrollment, pre-checked consent or forced continuity exists.",
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
      "Workspace export exists in the UI; retention and deletion procedures still need publication.",
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
      "Technical controls exist, but escalation, notification and recovery owners are not documented.",
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
