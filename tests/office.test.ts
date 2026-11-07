import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceOfficeStage,
  createVerifiedReward,
  emptyOfficeWorkspace,
  officeWorkspaceSchema,
  runOfficeStage,
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

test("content creation is blocked until an audited ORBIT mission is linked", () => {
  let office = emptyOfficeWorkspace();
  office.currentStage = "research";
  let result = advanceOfficeStage(office, "2026-11-06T00:00:00.000Z");
  assert.match(result.blocked || "", /ORBIT mission/);
  office = {
    ...office,
    orbit: {
      missionId: "mission-1",
      status: "linked",
      detail: "Linked to ORBIT mission mission-1.",
      linkedAt: "2026-11-06T00:00:00.000Z",
    },
  };
  result = advanceOfficeStage(office, "2026-11-06T00:00:00.000Z");
  assert.equal(result.blocked, null);
  assert.equal(result.office.currentStage, "creation");
});

test("the office runs assigned employees through the real inference contract", async () => {
  const office = emptyOfficeWorkspace();
  const calls: string[] = [];
  const ran = await runOfficeStage(
    office,
    "Build a short-form research brief from the supplied sources.",
    async ({ role, input }) => {
      calls.push(`${role}:${input.includes("supplied")}`);
      return `handoff from ${role}`;
    },
    "2026-11-06T00:00:00.000Z",
  );
  assert.deepEqual(calls, ["research:true", "audience:true"]);
  assert.equal(ran.runs.length, 1);
  assert.equal(ran.runs[0].status, "completed");
  assert.equal(ran.runs[0].agents.length, 2);
  assert.equal(ran.handoffs.at(-1)?.evidenceRefs.length, 1);
  assert.ok(
    ran.agents
      .filter((agent) => ["research", "audience"].includes(agent.id))
      .every((agent) => agent.state === "waiting"),
  );
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

test("rewards share one revenue budget and revoked rewards release it", () => {
  const office = emptyOfficeWorkspace();
  const now = "2026-11-06T00:00:00.000Z";
  office.verifiedRevenue.push({
    id: "shared-revenue",
    platform: "youtube",
    amount: 100,
    currency: "USD",
    source: "platform_payout",
    externalReference: "payout-shared",
    verifiedAt: now,
    verifiedBy: "owner",
  });
  const first = createVerifiedReward(office, "shared-revenue", 60, now);
  office.rewards.push(first);
  assert.throws(
    () => createVerifiedReward(office, "shared-revenue", 50, now),
    /covered by verified revenue/,
  );
  const remaining = createVerifiedReward(office, "shared-revenue", 40, now);
  office.rewards.push({ ...remaining, status: "paid" });
  assert.equal(officeWorkspaceSchema.safeParse(office).success, true);
  assert.throws(
    () => createVerifiedReward(office, "shared-revenue", 1, now),
    /covered by verified revenue/,
  );
  assert.equal(
    officeWorkspaceSchema.safeParse({
      ...office,
      rewards: [...office.rewards, { ...remaining, id: "overflow", amount: 1 }],
    }).success,
    false,
  );
  office.rewards[0] = { ...first, status: "revoked" };
  assert.equal(
    createVerifiedReward(office, "shared-revenue", 60, now).amount,
    60,
  );
});
