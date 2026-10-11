# Ecomoda persistence adapter

Connect `createFileStore(privatePersistentDirectory)` from `lib/ecomoda-file-store.mjs` as the `store` argument of `runCycle`. This is an executable filesystem adapter, not a deployed service. Live inference is still unconnected.

The directory must be on a persistent private local volume, outside the public web root and outside git. No project memory was seeded or uploaded by this change. Only approved project outputs should be supplied; the original task is stored as a hash. Checkpoints and failures survive adapter reconstruction. Exclusive file creation prevents concurrent claims; finished tasks skip. Different task text under the same ID is rejected. Writes use same-directory atomic rename, without a power-loss fsync guarantee. This is not a distributed/object-storage adapter.

A hard process crash leaves a lock. Recover manually only after confirming the old worker is stopped. Never delete a live worker's lock. Normal inference failures release the lock and retain checkpoints. Calls within a single claimed task must be sequential, as runCycle already does.

Validation: `node --test tests/ecomoda-file-store.test.mjs` passes three integration tests: contention/ownership, failure and resumed cycle without repeating the plan, and task-identity protection. These use controlled inference outputs, not a live model. The existing package test glob covers `.ts` only; run this command explicitly.

ORBIT publication remains paused pending Juan's acceptance of realistic quality. Runway and new paid inference remain disallowed. No renderer or post was modified.
