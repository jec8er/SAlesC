# ORBIT Business Factory V1 — commercial agent foundation

Status: isolated prototype, not integrated into the app or deployed.

## What this implements
A deterministic mission planner in `lib/business-factory.mjs` plus Node tests. Six task departments operate in a dependency graph:
Research → Offer builder → Unit economics → Quality → (Sales draft, Content draft).

Each task has an explicit output type, allocated time and cost ceilings, a revision check, evidence references, an owner review gate, and an auditable event log. All changes are pure in-memory functions: the caller must persist the returned mission. No background work is scheduled by this implementation.

## Integration work still required
1. Add SQLite mission and task storage with atomic revision updates, owner-only authenticated HTTP routes, input schemas and audit log.
2. Add a dedicated React mission board inside the private owner workspace.
3. Implement adapters for research and original commercial artifact generation with separate spending/rate limits and mocked contract tests.
4. Keep research sources verifiable, use permitted data, and require review before any messaging, publication, customer delivery or external API action.
5. Add real processor-based paid revenue ingestion rather than entering estimated sales as actuals.
6. Test restart persistence, authorization and failure recovery before use with real customers.

## Safety and scope
The existing trading/paper infrastructure is unchanged. This module cannot place trades, send emails, create listings, collect payments, deploy services, or create true autonomous AI workers. It is the bounded coordination foundation. Do not represent a mission plan as real sales or agents running continuously.

## Manual verification
`npm test`
`npm run format:check`
`npm run build`

## Initial pilot
Validate the existing Direct Commerce Launch offer for one consenting local merchant. Document concrete buyer evidence, create a bounded offer, calculate unit economics, review quality, and only then prepare sales and content drafts. The human owner decides whether to send or publish.
