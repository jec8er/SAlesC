# ORBIT Business Factory V1 — commercial agent foundation

Status: integrated into the authenticated owner workspace and SQLite API. No
external execution is enabled.

## What this implements

A deterministic mission planner in `lib/business-factory.mjs` plus Node tests.
Six task departments operate in a gated dependency graph:
Research → Offer builder → (Unit economics, U.S. policy review) → Quality →
(Sales draft, Content draft).

Each task has an explicit output type, allocated time and cost ceilings, a revision check, evidence references, an owner review gate, and an auditable event log. All changes are pure in-memory functions: the caller must persist the returned mission. No background work is scheduled by this implementation.

New missions select one of the 50 states or Washington, D.C. and attach an
auditable U.S. policy-readiness pack. Quality cannot begin and launch remains
blocked until the policy artifact has evidence and explicit owner approval. See
`docs/us-policy-pack.md`.

## Integration work still required

1. Implement adapters for research and original commercial artifact generation
   with separate spending/rate limits and mocked contract tests.
2. Keep research sources verifiable, use permitted data, and require review
   before any messaging, publication, customer delivery or external API action.
3. Connect processor-based paid revenue ingestion to mission attribution rather
   than treating estimates, pipeline, or approvals as collected revenue.
4. Have qualified U.S. counsel validate the policy templates and each intended
   activity/state before public launch.
5. Add recovery tests for interrupted policy reviews before enabling any
   external action adapters.

## Safety and scope

The existing trading/paper infrastructure is unchanged. This module cannot place trades, send emails, create listings, collect payments, deploy services, or create true autonomous AI workers. It is the bounded coordination foundation. Do not represent a mission plan as real sales or agents running continuously.

## Manual verification

`npm test`
`npm run format:check`
`npm run build`

## Initial pilot

Validate the existing Direct Commerce Launch offer for one consenting local merchant. Document concrete buyer evidence, create a bounded offer, calculate unit economics, review quality, and only then prepare sales and content drafts. The human owner decides whether to send or publish.
