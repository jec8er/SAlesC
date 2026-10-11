import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProjectContext,
  projectContextLimits,
} from "../lib/ecomoda-project-context.mjs";

const at = (n) => `2026-10-11T${String(n).padStart(2, "0")}:00:00Z`;

test("builds bounded recent context without evidence references or completed actions", () => {
  const memory = {
    schemaVersion: 1,
    preferences: [
      { area: "quality", key: "older", value: "old", updatedAt: at(1) },
      { area: "creative", key: "newer", value: "new", updatedAt: at(2) },
    ],
    verifiedState: [
      {
        kind: "artifact",
        statement: "Render compiled",
        evidenceRef: "private/path/file.zip",
        observedAt: at(3),
      },
    ],
    nextActions: [
      {
        id: "finished",
        action: "Already complete",
        status: "done",
        updatedAt: at(4),
      },
      {
        id: "next",
        action: "Inspect the next artifact",
        status: "pending",
        updatedAt: at(5),
      },
    ],
  };
  const context = buildProjectContext(memory);
  assert.deepEqual(
    context.preferences.map((item) => item.key),
    ["newer", "older"],
  );
  assert.equal(context.verifiedState[0].statement, "Render compiled");
  assert.equal("evidenceRef" in context.verifiedState[0], false);
  assert.deepEqual(
    context.nextActions.map((item) => item.id),
    ["next"],
  );
  assert.equal(JSON.stringify(context).includes("private/path"), false);
});

test("caps each section before inference", () => {
  const memory = {
    schemaVersion: 1,
    preferences: Array.from({ length: 30 }, (_, i) => ({
      area: "operations",
      key: `key_${i}`,
      value: `value ${i}`,
      updatedAt: at(i % 24),
    })),
    verifiedState: [],
    nextActions: [],
  };
  assert.equal(
    buildProjectContext(memory).preferences.length,
    projectContextLimits.preferences,
  );
});

test("reuses memory validation and rejects identity or secret fields", () => {
  assert.throws(
    () =>
      buildProjectContext({
        schemaVersion: 1,
        preferences: [],
        verifiedState: [],
        nextActions: [],
        biography: "Juan",
      }),
    /forbidden field/,
  );
  assert.throws(
    () =>
      buildProjectContext({
        schemaVersion: 1,
        preferences: [
          {
            area: "operations",
            key: "token",
            value: "api_key=secret-secret-secret",
            updatedAt: at(1),
          },
        ],
        verifiedState: [],
        nextActions: [],
      }),
    /credential or secret/,
  );
});
