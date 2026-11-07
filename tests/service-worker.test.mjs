import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createFileStore } from "../lib/ecomoda-file-store.mjs";
import { createServiceWorker } from "../server/service-worker.mjs";

test("queued requests run through inference and survive restart without duplicate generation", async () => {
  const root = await mkdtemp(join(process.cwd(), "orbit-worker-test-"));
  const db = new DatabaseSync(":memory:");
  let calls = 0;
  const infer = async ({ role }) => {
    calls++;
    return role === "Marcela" ? '{"accepted":true,"defects":[]}' : "Evidence-based artifact";
  };
  const store = createFileStore(root);
  const worker = createServiceWorker({ db, store, infer });
  try {
    worker.enqueue("job-1", "Create a description from these supplied facts.");
    assert.throws(() => worker.enqueue("job-1", "Different task"), /already used/);
    assert.equal((await worker.tick()).status, "awaiting_artifact_validation");
    assert.equal(calls, 3);
    assert.equal((await worker.tick()).status, "idle");
    // Simulate interruption between durable finish and the queue update.
    db.prepare("UPDATE service_jobs SET status='running'").run();
    const restarted = createServiceWorker({ db, store, infer });
    assert.equal((await restarted.tick()).status, "awaiting_artifact_validation");
    assert.equal(calls, 3);
    assert.equal(restarted.summary().targetUsd, 2000000);
    await restarted.stop();
  } finally {
    await worker.stop();
    db.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("failures back off and stop after three attempts", async () => {
  const root = await mkdtemp(join(process.cwd(), "orbit-worker-test-"));
  const db = new DatabaseSync(":memory:");
  let clock = 0;
  const worker = createServiceWorker({
    db, store: createFileStore(root), now: () => clock,
    infer: async () => { throw Error("offline"); },
  });
  try {
    worker.enqueue("offline", "Write a brief");
    assert.equal((await worker.tick()).status, "queued");
    assert.equal((await worker.tick()).status, "idle");
    clock = 100000;
    await worker.tick();
    clock = 200000;
    assert.equal((await worker.tick()).status, "blocked");
    assert.equal(worker.inspect("offline").attempts, 3);
  } finally {
    await worker.stop();
    db.close();
    await rm(root, { recursive: true, force: true });
  }
});
