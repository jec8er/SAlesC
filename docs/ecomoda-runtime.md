# Ecomoda operating core

This is a provider-independent workflow, not a trained model or a running AI service.

## Implemented

- Bounded planning, production, independent review and one revision.
- SQLite event history and restart-safe checkpoints.
- Atomic task claims; expired workers cannot change a newer worker's work.
- Stable cycle ID plus task digest prevents accidental reuse for another task.
- Invalid reviews are rejected before being saved as successful checkpoints.
- Model approval never marks an artifact technically validated or publishes it.

## Integration

Use Node 24+. Import runCycle from lib/ecomoda-core.mjs and createCycleStore
from server/ecomoda-store.mjs. Supply an authenticated inference function with
signature async ({role, instructions, input, signal}) => string.

Create a separate store instance per cycle, using the same private database path.
Use stable IDs for retries of the same task. Close the store when the cycle settles.
Do not close a shared database while another cycle is using it.

The default lease is ten minutes. A cycle exceeding its lease cannot commit its
result; a later worker can recover the saved checkpoints. Inference adapters
should implement bounded requests and respect AbortSignal. Generated text cannot
execute tools. Rendering, publication and payment verification require separate
trusted integrations.

Keep this database, model credentials and customer/project memory outside git.
Deploy on a persistent volume: a temporary filesystem cannot preserve memory.

## Validation

node --test tests/ecomoda-core.test.mjs tests/ecomoda-store.test.mjs

Eight checks cover restart persistence, competing workers, expired-owner fencing,
retry recovery, invalid review recovery, publication/revenue separation and missing
inference. These are deterministic integration checks, not live model evaluation.

## Remaining work

Connect real inference and the authenticated application interface; run a live
conversation and verify its saved result. No new hosted model, autonomous
publication, revenue or production deployment is established by these modules.
