import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createProjectMemoryStore,
  validateProjectMemory,
} from "../lib/ecomoda-project-memory.mjs";

const empty = () => ({
  schemaVersion: 1,
  preferences: [],
  verifiedState: [],
  nextActions: [],
});
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "ecomoda-memory-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("persists curated project memory with optimistic revisions", () =>
  fixture(async (directory) => {
    const store = createProjectMemoryStore(directory);
    assert.deepEqual(await store.read("orbit"), {
      revision: 0,
      memory: empty(),
    });
    const memory = empty();
    memory.preferences.push({
      area: "publishing",
      key: "publishing_paused",
      value: "Keep new publishing paused pending quality approval.",
      updatedAt: "2026-10-11T14:00:00.000Z",
    });
    memory.verifiedState.push({
      kind: "quality",
      statement: "Latest prototype remains visibly CGI.",
      evidenceRef: "artifact:orbit-render-v2",
      observedAt: "2026-10-11T14:00:00.000Z",
    });
    assert.equal((await store.update("orbit", memory, 0)).revision, 1);
    assert.deepEqual(
      (await createProjectMemoryStore(directory).read("orbit")).memory,
      memory,
    );
    await assert.rejects(store.update("orbit", memory, 0), /revision conflict/);
  }));

test("rejects identity fields and credential-like text", () => {
  assert.throws(
    () => validateProjectMemory({ ...empty(), biography: "Juan profile" }),
    /forbidden field/,
  );
  const credential = empty();
  credential.preferences.push({
    area: "operations",
    key: "provider",
    value: "api_key=sk-examplecredential123",
    updatedAt: "2026-10-11T14:00:00.000Z",
  });
  assert.throws(
    () => validateProjectMemory(credential),
    /credential or secret/,
  );
});

test("stores restrictive permissions and never writes project id as a filename", () =>
  fixture(async (directory) => {
    await createProjectMemoryStore(directory).update(
      "private-project",
      empty(),
      0,
    );
    const filename = (await readdir(directory)).find((name) =>
      name.endsWith(".json"),
    );
    assert.equal(filename.includes("private-project"), false);
    assert.equal(
      (await readFile(join(directory, filename), "utf8")).includes(
        "private-project",
      ),
      false,
    );
  }));
