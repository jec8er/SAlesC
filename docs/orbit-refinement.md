# ORBIT refinement — November 3, 2026

## Product decision

One owner workspace to turn an objective into evidenced work and a repeatable
service. Initial buyer hypothesis: small cleaning businesses that already receive
inquiries but need a consistent quote and follow-up process. This is not a
validated market or a promise of income.

The owner wants the assistant to do the work, rather than assign routine tasks
back to them. In this release the assistant can develop and validate the software
from an active session. The commercial mission planner has no connected background
executor or external research adapter. A separate Ecomoda core already implements
bounded cycles, checkpoint recovery and an inference adapter contract; it is not
connected to these commercial missions. Closing the assistant does not establish
autonomous agents running. The local scoring engine is deterministic, not a language model.

## Implemented in this refinement

- Operations is the default authenticated view.
- English guidance identifies the current capability boundary.
- Mission status comes from the existing authenticated SQLite API, including
  completed tasks and blockers. No synthetic sales or financial progress.
- An editable customer and state create a pilot mission with zero external budget,
  120 planning minutes and no automated decisions about people.
- Save and load errors are visible; a successful save is acknowledged before
  refreshing, so refresh failure does not suggest the original save failed.
- Existing commercial review and trading restrictions remain in force.
- Artifact and review inputs use inline forms instead of blocking browser prompts.
  Actual cost, time and evidence are recorded, and the last review is visible.
- Load, empty, saved and refresh-failure states are distinguished. A saved change
  is not reported as failed merely because the subsequent list refresh failed.
- Operations labels, generated pilot goals, errors and legacy script output are
  English. Existing owner/customer-authored records are preserved as entered.

## Ten-step roadmap

1. Inventory the current application. Code reviewed; full interactive audit pending.
2. Establish the commercial operations home. Implemented in this change.
3. Align documentation with the actual capabilities. Updated in this change.
4. Add durable inquiry, quote and follow-up records. Implemented as an owner-only
   service desk with version checks, quote history, approvals and exports.
5. Demonstrate the internal service workflow using clearly labeled fictional data.
   Local browser verification is recorded in `docs/service-desk.md`; public intake,
   notifications, customer acceptance and automatic delivery remain pending.
6. Validate the problem with five potential buyers. No interviews or demand claimed.
7. Agree one bounded paid pilot after delivery capability is demonstrated. No buyer yet.
8. Deliver and measure response time, quotes and administration time for seven days.
9. Standardize installation, support, cost limits and recovery before scaling.
10. Attribute verified payments and refunds to delivered work; review collected cash,
    costs and committed work weekly. Never count pipeline as cash.

## Execution design for subsequent releases

Reuse the existing Ecomoda cycle store and claim fencing instead of duplicating
recovery machinery. Connect it explicitly to commercial missions before presenting
these as executed work. Use durable jobs with queued, running, waiting-for-approval, succeeded and failed
states. Every job needs an idempotency key, bounded retries, time/cost ceilings,
evidence, timestamps and recovery after restart. External actions require an
adapter with a truthful success receipt. Do not mark a task complete merely because
an agent wrote a plan. Gather only data needed for delivery and isolate customer
access before serving multiple organizations.

Identity checks, contracts, spending, live billing and external communications
need the owner's applicable authorization. Existing review gates cannot be removed
to simulate readiness. A professional review remains a genuine external dependency
where the existing workflow requires it.

## Commercial assumptions

The previously proposed USD 1,000 setup price is only a test hypothesis. Determine
scope, support and actual cost before offering a binding quote. No revenue or
ability to collect USD 20,000 by the 28th has been established. A target amount
must not increase sales forecasts without actual customer evidence.

## Acceptance checks

Sign in; operations should be the initial view. Empty state must not look like a
load failure. Create a pilot, navigate away and back, and confirm persistence.
Follow the missions link; the saved mission must have research ready and later
tasks pending. Reloading must not create another mission. Check errors without
revealing credentials. No sending, spending, publishing or billing is triggered.

## Verification of this change

- All 69 automated tests passed, including authenticated mission creation,
  revision checks and restart persistence.
- TypeScript, the production build and repository formatting passed.
- Browser verification on an isolated local SQLite fixture covered pilot creation,
  task start, inline artifact submission with evidence and five measured minutes,
  approval, dependency unlocking and persistence after reload. No buyer interviews,
  real payments, customer deliveries or autonomous execution were performed.
- Dependency installation reported three existing audit findings (one moderate,
  two high). Dependencies were not upgraded in this focused product change.
