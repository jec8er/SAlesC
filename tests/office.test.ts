import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceOfficeStage,
  createVerifiedReward,
  emptyOfficeWorkspace,
  officeWorkspaceSchema,
} from "../lib/office.ts";
import { createOllamaAdapter } from "../lib/ollama-adapter.ts";
import { chooseBestQwenModel } from "../lib/ollama-adapter.ts";

test("the office starts with exactly 18 idle agents and no fabricated connectors", () => {
  const office = emptyOfficeWorkspace();
  assert.equal(office.agents.length, 18);
  assert.ok(office.agents.every((agent) => agent.state === "idle"));
  assert.ok(
    office.connectors.every(
      (connector) => connector.status === "not_configured",
    ),
  );
  assert.equal(office.verifiedRevenue.length, 0);
  assert.equal(office.rewards.length, 0);
});

test("distribution is blocked until both platform adapters are ready", () => {
  let office = emptyOfficeWorkspace();
  office.currentStage = "review";
  let result = advanceOfficeStage(office, "2026-11-06T00:00:00.000Z");
  assert.match(result.blocked || "", /TikTok/);
  office = {
    ...office,
    connectors: office.connectors.map((connector) =>
      connector.id === "tiktok"
        ? { ...connector, status: "ready" as const }
        : connector,
    ),
  };
  result = advanceOfficeStage(office, "2026-11-06T00:00:00.000Z");
  assert.match(result.blocked || "", /YouTube/);
});

test("rewards cannot be created without verified revenue evidence", () => {
  const office = emptyOfficeWorkspace();
  assert.throws(
    () =>
      createVerifiedReward(office, "missing", 10, "2026-11-06T00:00:00.000Z"),
    /Verified revenue evidence/,
  );
  office.verifiedRevenue.push({
    id: "rev-1",
    platform: "youtube",
    amount: 100,
    currency: "USD",
    source: "platform_payout",
    externalReference: "payout-1",
    verifiedAt: "2026-11-06T00:00:00.000Z",
    verifiedBy: "owner",
  });

  const reward = createVerifiedReward(
    office,
    "rev-1",
    25,
    "2026-11-06T00:00:00.000Z",
  );
  assert.equal(reward.status, "eligible");
  const validated = officeWorkspaceSchema.safeParse({
    ...office,
    rewards: [reward],
  });
  assert.equal(validated.success, true);
});

test("Ollama auto-selects the strongest installed Qwen model", async () => {
  assert.equal(
    chooseBestQwenModel(["llama3:70b", "qwen2.5:7b", "qwen3:32b", "qwq:32b"]),
    "qwq:32b",
  );
  const originalFetch = globalThis.fetch;
  let chatModel = "";
  globalThis.fetch = async (input, init) => {
    if (input === "http://ollama.test/api/tags")
      return new Response(
        JSON.stringify({
          models: [{ name: "qwen2.5:7b" }, { name: "qwen3:32b" }],
        }),
        { status: 200 },
      );
    chatModel = (JSON.parse(String(init?.body)) as { model: string }).model;
    return new Response(
      JSON.stringify({ message: { content: "local proposal" } }),
      { status: 200 },
    );
  };
  try {
    const adapter = createOllamaAdapter({ baseUrl: "http://ollama.test" });
    assert.equal(adapter.status().status, "not_configured");
    assert.equal(
      await adapter.infer({
        role: "research",
        instructions: "Use supplied evidence only.",
        input: "Review this brief.",
      }),
      "local proposal",
    );
    assert.equal(chatModel, "qwen3:32b");
    assert.equal(adapter.status().model, "qwen3:32b");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ollama uses an explicit model override and the local chat contract", async () => {
  const disconnected = createOllamaAdapter();
  assert.equal(disconnected.status().status, "not_configured");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "http://ollama.test/api/chat");
    const body = JSON.parse(String(init?.body)) as {
      model: string;
      stream: boolean;
    };
    assert.equal(body.model, "qwen3:8b");
    assert.equal(body.stream, false);
    return new Response(
      JSON.stringify({ message: { content: "local proposal" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const adapter = createOllamaAdapter({
      baseUrl: "http://ollama.test",
      model: "qwen3:8b",
    });
    assert.equal(adapter.status().status, "ready");
    assert.equal(
      await adapter.infer({
        role: "research",
        instructions: "Use supplied evidence only.",
        input: "Review this brief.",
      }),
      "local proposal",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
