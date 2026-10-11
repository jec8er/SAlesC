import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStore } from "../lib/ecomoda-file-store.mjs";
import { runCycle } from "../lib/ecomoda-core.mjs";
async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), "ecomoda-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("independent stores cannot overlap or mutate another claim", () =>
  fixture(async (dir) => {
    const a = createFileStore(dir),
      b = createFileStore(dir);
    const claims = await Promise.all([
      a.claim("job", "task"),
      b.claim("job", "task"),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    const winner = claims[0] ? a : b,
      loser = claims[0] ? b : a;
    await assert.rejects(loser.append("job", {}), /not owned/);
    await winner.release("job");
    assert.equal(await loser.claim("job", "task"), true);
    await loser.release("job");
  }));
test("failed cycle resumes saved outputs after constructing a new adapter", () =>
  fixture(async (dir) => {
    let calls = 0;
    await assert.rejects(
      runCycle({
        id: "job",
        task: "project-safe task",
        store: createFileStore(dir),
        infer: async () => {
          if (++calls === 1) return "saved plan";
          throw Error("offline");
        },
      }),
      /offline/,
    );
    const roles = [];
    const result = await runCycle({
      id: "job",
      task: "project-safe task",
      store: createFileStore(dir),
      infer: async ({ role }) => {
        roles.push(role);
        return role === "Marcela" ? '{"accepted":true,"defects":[]}' : "draft";
      },
    });
    assert.deepEqual(roles, ["Hugo", "Marcela"]);
    assert.equal(result.publishAllowed, false);
    assert.equal(
      (
        await runCycle({
          id: "job",
          task: "project-safe task",
          store: createFileStore(dir),
          infer: async () => {
            throw Error("unexpected");
          },
        })
      ).status,
      "skipped",
    );
    const file = (await readdir(dir)).find((x) => x.endsWith(".json"));
    assert.equal(
      (await readFile(join(dir, file), "utf8")).includes("project-safe task"),
      false,
    );
  }));
test("different task cannot silently reuse checkpoints", () =>
  fixture(async (dir) => {
    const a = createFileStore(dir);
    await a.claim("job", "old");
    await a.release("job");
    await assert.rejects(
      createFileStore(dir).claim("job", "new"),
      /different work/,
    );
    assert.equal(
      (await readdir(dir)).some((x) => x.endsWith(".lock")),
      false,
    );
  }));
test("inspection exposes lifecycle metadata without task text or model output", () =>
  fixture(async (dir) => {
    const store = createFileStore(dir);
    assert.deepEqual(await store.inspect("none"), {
      exists: false,
      status: "missing",
      checkpointCount: 0,
    });
    await store.claim("job", "private task text");
    await store.append("job", {
      role: "Betty",
      output: "private model output",
      checkpointKey: 0,
      at: "2026-10-11T09:00:00.000Z",
    });
    assert.deepEqual(await store.inspect("job"), {
      exists: true,
      status: "active",
      checkpointCount: 1,
      updatedAt: "2026-10-11T09:00:00.000Z",
      resultStatus: null,
    });
    await store.release("job");
    const summary = await createFileStore(dir).inspect("job");
    assert.equal(summary.status, "checkpointed");
    assert.equal(JSON.stringify(summary).includes("private"), false);
  }));
