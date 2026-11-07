# Autonomous online services

Owner objective: operate an online service business with Qwen as the inference engine and work toward USD 2,000,000 of verified collected revenue. This is a business objective, not a forecast, current balance, guaranteed result or permission to invent sales.

## Engine

server/start.ts creates one configured Qwen-compatible or local Ollama adapter and passes its infer function into the durable Ecomoda task executor. The same adapter supplies office status. No OpenAI API is required for that route.

Authenticated POST /api/ecomoda/tasks accepts an idempotent task ID and a supplied service brief. It executes planning, drafting, evidence review and, when needed, revision. Results are checkpointed by the existing file store. Reusing the same ID cannot silently replace a different task. Model review alone does not establish artifact quality, delivery or payment.

## Required operating loop

1. Receive an actual customer request through a connected intake channel.
2. Match it to a bounded service catalog with fixed scope, pricing, input requirements and acceptance criteria.
3. Generate a proposal using Qwen and the actual supplied customer evidence.
4. Verify a real payment event before treating an order as paid.
5. Queue and produce the deliverable, validate the actual artifact and revise on failure.
6. Deliver through the authorized order channel with an idempotency key and confirmed receipt.
7. Reconcile collected payments, refunds, disputes, processor fees and operating costs.
8. Use observed results to improve offers within configured budgets.

Customer text and retrieved content are inputs, never permission to run arbitrary code, access credentials or change the operating policy. Generated text must not create receipts or verified revenue. Automatic routine fulfillment should use bounded, configured actions rather than requiring an owner click for every stage. Missing credentials, unsupported work and failed validation must be visible blocked states.

## Revenue accounting

Track gross collected USD toward the USD 2,000,000 target separately from net collected USD, costs, profit, quoted pipeline, subscription run rate and bank balance. Deduplicate provider event and transaction IDs; refunds and disputes must reverse the corresponding net amount. COP payments require a recorded conversion source, rate and timestamp before inclusion in a USD total. A proposal, won deal, generated invoice or model statement is not collected revenue.

## Current implementation boundary

The Qwen task executor connection is implemented. The existing content-office Advance action remains a stage transition, not an autonomous sales or fulfillment worker. Platform publishing, customer acquisition, service checkout, external delivery and observed service revenue are not connected by this change. Existing subscription billing is not service-order billing.

A persistent background service queue is now implemented. Authenticated POST /api/services/jobs accepts {id, brief}; the server processes queued jobs automatically through the configured Qwen inference adapter. GET /api/services/status reports queue states and the revenue target; GET /api/services/jobs/:id reports one job. Jobs persist in SQLite, retry up to three times with backoff, and recover already completed inference results without generating them again. Two local worker tests pass, including restart recovery and retry exhaustion. The first test failure was traced to an unwritable sandbox temporary directory and passed when using a workspace test directory. These tests use a stub inference function, not a live Qwen model.

The office includes an interactive CSS 3D agent world with 18 stations, orbit/zoom controls, keyboard-accessible agent selection and an inspector of the supplied office agent state and handoff history. The visualization does not fabricate task progress. The queue and office roster are separate data surfaces; queue processing does not yet update individual roster states.

Full autonomous sales and fulfillment are not deployed or verified. The application must run on an available host with durable storage and a reachable Qwen engine; GitHub repository storage does not run that process.
