# ORBIT policy pack

Version: 2026-11-03. Status: internal draft for owner and legal review.

These documents describe the current private application and the proposed pilot
service. They are not published customer terms, an accepted agreement or a claim
of compliance across the United States. No effective date is assigned until the
operator completes the publication checklist below and approves the final text.

## 1. Privacy notice

### Scope and roles

ORBIT is a private operations workspace for planning commercial work, recording
evidence and reviewing results. The operator manages owner account and service
administration data. If a customer later instructs the operator to process inquiry
or quote data on its behalf, the parties must first document their respective
roles, permitted purposes, security measures and service-provider obligations.
The owner-only service desk now stores manually entered inquiries, quote versions,
owner approvals and internal follow-up tasks. Public inquiry collection, customer
accounts, automated sending and customer quote acceptance are not implemented.

### Information and purposes

The current application stores a salted owner-password hash, sessions, workspace
records, mission descriptions, customer labels, evidence references, review
decisions and operational histories in local storage files and SQLite databases.
Project memory and cycle checkpoints may also store submitted task context and
generated outputs. Service desk records may include customer labels, contact
references, service requests, price/scope versions, follow-up dates and an activity
history. Use these records only to provide, secure, troubleshoot and
document the requested work. Do not enter passwords, payment-card numbers,
government identifiers, health data, access codes or unnecessary household details
in mission text or evidence. A customer label can itself identify a person.

The browser uses an essential session cookie. No advertising or analytics SDK is
currently installed. Optional tracking requires a new inventory, updated notice
and any applicable consent or opt-out mechanism before activation.

### Providers and disclosures

The application includes Stripe-hosted checkout and webhook processing, disabled
until configured. If activated, payment details entered on Stripe-hosted pages are
processed by Stripe; ORBIT records the billing information and event identifiers
needed by its configured integration. Do not enter card details into ORBIT forms.
The operator must verify and disclose the exact deployed billing data inventory.

The local scoring engine does not call a hosted language model. The optional local
model team runs the primary and reviewer on the configured host and processes task
text in private temporary prompt files. Outputs/checkpoints remain in private
runtime storage; authenticated owners can retrieve artifacts. This local adapter
does not send prompts to an external inference service. A separate cycle
engine can also receive an externally configured inference adapter. Before connecting
one, identify the provider, data sent, retention, training settings, subprocessors
and contractual protections. Do not send customer information to a model without
the necessary customer instructions and applicable authorization. Provider terms
must not be inferred from the presence or absence of an SDK.

No sale of personal information, cross-context advertising sharing or use of
customer content for model training is authorized by this draft. A change requires
review, updated disclosures and applicable choices before processing begins.
Disclosures required by law must be reviewed, minimized and documented.

### Requests and retention

Before collecting public customer data, publish a monitored privacy contact and
request procedure. Verify identity proportionately; do not demand unnecessary
documents. Support applicable access, correction, deletion, portability and opt-out
rights and authorized-agent requests. Evaluate applicability and deadlines for
each relevant jurisdiction rather than promising a universal response deadline.
Workspace export does not establish a complete privacy-request or deletion system.

Retain information only for documented service, security, accounting or legal
purposes. Before public launch, approve a category-specific retention schedule,
backup expiry and deletion workflow. Explain lawful retention exceptions and
legal holds. The current app does not implement automated retention or complete
erasure of databases, checkpoints, exports and backups.

## 2. Service terms

ORBIT currently provides a private planning, evidence and simulation workspace.
The proposed pilot organizes inquiries, quotes and follow-up; it is not yet an
available end-to-end customer service. A pilot may be sold only after delivery
capability is demonstrated and a written order defines scope, deliverables,
schedule, customer responsibilities, price, taxes, support and acceptance criteria.

Only adults authorized to act for the relevant business may contract for a pilot.
Do not share the owner login with customers or use the current single-owner
workspace as a verified multi-tenant service. Customers retain their rights in
their supplied information. Any permission to process it must be limited to the
agreed service; rights in deliverables must be stated in the order.

Planning, simulated outcomes, generated drafts and model approvals do not establish
completed work, legal approval, payment or revenue. No guaranteed sales, earnings,
investment returns or uninterrupted autonomous operation are offered. Financial
simulation remains separate from the commercial service and cannot execute trades.

Invoices and receipts must distinguish deposits, earned fees, processor charges,
refunds and collected cash. Proposal amounts and pipeline are not payments.
Liability, dispute procedures, governing law and any permitted limitations must
be reviewed for the actual operator and customer jurisdiction before contracting.
This draft does not impose arbitration or waive mandatory customer rights.

## 3. Acceptable use and delegated actions

Do not use ORBIT for deception, impersonation, fabricated testimonials, unsupported
earnings claims, unlawful profiling, spam, credential collection, unauthorized
access or processing data without the necessary rights. Do not bypass approval,
spending, review or activity restrictions. Evidence must refer to real sources and
completed work; synthetic demonstration data must be labeled.

Delegation is limited to the documented task, connected capabilities and applicable
authorization. Sending messages, publishing, charging, spending or entering
contracts requires the applicable authorization and an execution receipt. A draft
is not a sent message. Do not represent ORBIT as a continuous autonomous operator
unless deployment and restart recovery have been verified for the actual workflow.

Before commercial email, document sender authorization, truthful sender details,
the applicable postal address and opt-out process. Maintain suppression records
and meet applicable opt-out deadlines. SMS, calls and additional jurisdictions
require their own channel-specific assessment; email rules do not authorize them.

## 4. AI and automation disclosure

ORBIT's native council is a deterministic scoring and policy engine. Its separate
Ecomoda cycle engine supports bounded planning, production, review and checkpoint
recovery when an inference adapter is connected. Commercial missions are not
currently connected to that engine. The operations home stores plans and displays
recorded statuses; it does not execute customer work autonomously.

Generated text must be checked for factual accuracy, intellectual-property issues,
unsafe instructions and suitability before delivery. Model review is not technical
validation. Quotes require the business owner's approval. Material decisions about
people require a separately assessed workflow, appropriate disclosures and human
review where applicable. The pilot's default setting does not permit such decisions.

## 5. Pricing, cancellation and refunds

Pilot setup prices and subscription tiers remain hypotheses until a written offer
and functioning delivery are approved. This draft creates no subscription or charge.
Before any payment, disclose the full amount, currency, taxes, billing frequency,
deposit milestones, renewal terms and applicable cancellation and refund rules.

Proposed pilot rule for approval: a customer may cancel before work begins for a
full refund. After work begins, any retained amount must correspond to documented
work and the written order; return any unearned balance subject to applicable law.
If agreed deliverables cannot be provided, offer correction or an appropriate
refund under the order and mandatory rights. Do not characterize every deposit
as nonrefundable. The operator must approve this rule before offering it.

Do not activate recurring billing without affirmative agreement to its terms and
a tested, clearly disclosed cancellation method. The current application has no
verified self-service cancellation flow. Cancellation requests, their effective
dates and refunds must be recorded and confirmed. Do not promise immediate bank
settlement, automatic refunds or deletion solely because a subscription is canceled.

## 6. Security, retention and incident-response procedure

Before public deployment, assign an incident owner and backup contact, inventory
all data stores and provider access, configure HTTPS and production session
settings, keep secrets outside source control and verify backups and restoration.
Use least privilege, separate customers before handling multiple customer accounts,
and maintain a vulnerability-remediation process. Existing dependency audit findings
must be triaged before launch; the presence of security headers is not certification.

For a suspected incident: restrict affected access, preserve relevant evidence
without exposing secrets, assess affected data and people, contain the cause and
document remediation. The incident owner and counsel determine applicable notices,
recipients and deadlines from the facts and current law. Do not wait for a routine
support cycle or promise one universal breach-notification period. Notify customers
according to applicable law and agreed contractual responsibilities. Test recovery
and track corrective actions before restoring affected capabilities.

## 7. U.S. jurisdiction addendum and review record

The selector covers 50 states and Washington, D.C.; it is not a 51-jurisdiction
legal analysis. The business location alone does not determine applicability:
consider customer and resident locations, data types, volume, activity and relevant
thresholds. Record any additional applicable jurisdictions in the review evidence.

For New York, assess SHIELD Act safeguards and incident obligations for covered
private information. For California, assess whether the operator or customer is
a covered business, service provider or contractor and document applicable rights,
contracts and choices. Neither framework is automatically satisfied by choosing
the state in a form. Children-directed activity and investment advice retain their
existing specialized review blockers.

Retain the policy version, reviewed jurisdictions, activity, reviewer identity,
date, evidence, unresolved issues and approval. A changed product, data flow,
provider, billing model or jurisdiction requires reassessment. The existing
attorney-review gate remains in place; adding this file does not approve a mission.

## 8. Publication checklist — unresolved

- Confirm the legal operator identity, business address and monitored support and
  privacy contacts. No contact details have been invented in this draft.
- Approve the actual offer, cancellation/refund rule and customer order form.
- Complete the deployed data/provider inventory, retention periods, deletion and
  request procedures, incident contacts and required customer data-processing terms.
- Assess all applicable jurisdictions and obtain the recorded professional review.
- Verify the claimed features, checkout/cancellation paths and security controls.
- Publish the approved notices at collection, agreement and payment points; record
  the effective date and accepted version. Documentation in GitHub alone is not
  publication to customers or proof of consent.

## Official review sources

Consulted November 3, 2026. These are starting points, not a complete legal survey.

- FTC privacy/security: https://www.ftc.gov/business-guidance/privacy-security
- FTC commercial email: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- FTC subscription consumer guidance: https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions
- New York SHIELD Act: https://ag.ny.gov/resources/organizations/data-breach-reporting/shield-act
- California CCPA: https://oag.ca.gov/privacy/ccpa
- FTC COPPA: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- SEC adviser registration: https://www.investor.gov/introduction-investing/investing-basics/glossary/investment-adviser-registration
