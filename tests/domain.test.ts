import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  metrics,
  workspaceSchema,
  catalogHTML,
  proposalHTML,
  dealReadiness,
  salesQueue,
  followUpText,
  outreachPack,
  orbitReadiness,
  orbitHandoff,
  emptyTradingWorkspace,
  paperMetrics,
  parseCandleCSV,
  runSMABacktest,
  runOrbitCouncil,
  planAgentMission,
  decideAgentMission,
  strategyRisk,
} from "../lib/domain.ts";
const receipt = {
  id: "r",
  label: "Setup",
  kind: "service" as const,
  currency: "USD" as const,
  gross: 199,
  cost: 40,
  fees: 6,
  refund: 0,
  status: "paid" as const,
  reference: "receipt-1",
  date: "2026-10-11",
};
test("pending revenue and won deals never inflate collected revenue", () => {
  const w = emptyWorkspace();
  w.receipts = [{ ...receipt, status: "pending", reference: "" }];
  w.deals = [
    {
      id: "d",
      name: "Won",
      contact: "",
      stage: "won",
      value: 999,
      nextAction: "",
      due: "",
      notes: "",
    },
  ];
  assert.equal(metrics(w).collected, 0);
  assert.equal(metrics(w).pending, 199);
  assert.equal(metrics(w).pipeline, 0);
});

test("ORBIT sizes a paper position by the strictest risk guardrail", () => {
  const strategy = {
    id: "s1",
    name: "Bounded momentum",
    symbol: "BTC/USDC",
    timeframe: "4h" as const,
    thesis: "A falsifiable paper-only scenario.",
    status: "approved" as const,
    confidence: 75,
    entry: 100,
    stopLoss: 90,
    takeProfit: 120,
    riskPercent: 2,
    createdAt: "2026-10-12T12:00:00.000Z",
  };
  const sizing = strategyRisk(strategy, 10000, 10);
  assert.equal(sizing.quantity, 10);
  assert.equal(sizing.notional, 1000);
  assert.equal(sizing.riskAmount, 100);
  assert.equal(sizing.rewardToRisk, 2);
});

test("paper metrics separate modeled equity, risk and win rate", () => {
  const trading = emptyTradingWorkspace();
  trading.paperTrades = [
    {
      id: "closed-win",
      strategyId: "s1",
      symbol: "ETH/USDC",
      side: "long",
      status: "closed",
      entry: 100,
      mark: 110,
      quantity: 10,
      riskAmount: 50,
      pnl: 100,
      openedAt: "2026-10-12T12:00:00.000Z",
      closedAt: "2026-10-12T13:00:00.000Z",
    },
    {
      id: "open-loss",
      strategyId: "s2",
      symbol: "BTC/USDC",
      side: "long",
      status: "open",
      entry: 100,
      mark: 95,
      quantity: 10,
      riskAmount: 80,
      pnl: -50,
      openedAt: "2026-10-12T14:00:00.000Z",
    },
  ];
  assert.deepEqual(paperMetrics(trading), {
    equity: 10050,
    realizedPnl: 100,
    unrealizedPnl: -50,
    openRisk: 80,
    winRate: 100,
    closedTrades: 1,
  });
});

test("candle CSV parsing validates headers, chronology and price ranges", () => {
  const rows = Array.from({ length: 30 }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `2026-01-${day}T00:00:00Z,100,105,95,102,1000`;
  });
  const candles = parseCandleCSV(
    ["timestamp,open,high,low,close,volume", ...rows].join("\n"),
  );
  assert.equal(candles.length, 30);
  assert.equal(candles[0].close, 102);
  assert.throws(
    () =>
      parseCandleCSV(
        ["timestamp,open,high,low,close", ...rows.slice(0, 29), rows[0]].join(
          "\n",
        ),
      ),
    /strictly increasing time order/,
  );
});

test("SMA backtests are deterministic, fee-aware and bounded", () => {
  const candles = Array.from({ length: 120 }, (_, index) => {
    const previous = 100 + Math.sin((index - 1) / 4) * 12 + index * 0.05;
    const close = 100 + Math.sin(index / 4) * 12 + index * 0.05;
    return {
      timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      open: previous,
      high: Math.max(previous, close) + 1,
      low: Math.min(previous, close) - 1,
      close,
      volume: 1000,
    };
  });
  const options = {
    startingBalance: 10000,
    fastWindow: 3,
    slowWindow: 8,
    feeBps: 10,
    positionPercent: 10,
  };
  const result = runSMABacktest(candles, options);
  const repeated = runSMABacktest(candles, options);
  assert.deepEqual(result, repeated);
  assert.ok(result.trades > 0);
  assert.ok(result.maxDrawdownPercent >= 0);
  assert.ok(result.maxDrawdownPercent <= 100);
  assert.equal(
    result.netReturnPercent,
    ((result.endingBalance - 10000) / 10000) * 100,
  );
  assert.throws(
    () => runSMABacktest(candles, { ...options, fastWindow: 10 }),
    /fast < slow/,
  );
});

test("older ORBIT workspaces gain an empty backtest history on parse", () => {
  const workspace = emptyWorkspace();
  const legacyTrading = { ...workspace.trading } as Record<string, unknown>;
  delete legacyTrading.backtests;
  const legacy = { ...workspace, trading: legacyTrading };
  const parsed = workspaceSchema.parse(legacy);
  assert.deepEqual(parsed.trading?.backtests, []);
});

test("backtest summaries cannot reference a missing strategy", () => {
  const workspace = emptyWorkspace();
  workspace.trading!.backtests.push({
    id: "bt-orphan",
    strategyId: "missing",
    symbol: "BTC/USDC",
    sourceName: "candles.csv",
    sourceHash: "a".repeat(64),
    algorithm: "sma-crossover-v1",
    fastWindow: 20,
    slowWindow: 50,
    feeBps: 10,
    positionPercent: 10,
    bars: 100,
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-04-10T00:00:00.000Z",
    startingBalance: 10000,
    endingBalance: 10100,
    netReturnPercent: 1,
    buyHoldReturnPercent: 2,
    maxDrawdownPercent: 3,
    winRate: 50,
    trades: 4,
    profitFactor: 1.2,
    testedAt: "2026-10-12T12:00:00.000Z",
  });
  const parsed = workspaceSchema.safeParse(workspace);
  assert.equal(parsed.success, false);
  if (!parsed.success)
    assert.match(
      parsed.error.issues.map((issue) => issue.message).join(" "),
      /backtest must reference an existing strategy/,
    );
});

test("ORBIT native council refuses to invent evidence", () => {
  const workspace = emptyWorkspace();
  const strategy = {
    id: "native-no-evidence",
    name: "Unproven thesis",
    symbol: "BTC/USDC",
    timeframe: "4h" as const,
    thesis: "A thesis awaiting historical evidence.",
    status: "review" as const,
    confidence: 70,
    entry: 100,
    stopLoss: 95,
    takeProfit: 110,
    riskPercent: 1,
    createdAt: "2026-10-12T12:00:00.000Z",
  };
  workspace.trading!.strategies.push(strategy);
  const council = runOrbitCouncil(workspace.trading!, strategy, {
    id: "council-empty",
    generatedAt: "2026-10-12T13:00:00.000Z",
  });
  assert.equal(council.recommendation, "observe");
  assert.equal(council.agents.length, 6);
  assert.ok(council.blockers.some((blocker) => /No historical/.test(blocker)));
  assert.equal(council.ownerDecision, "pending");
});

test("ORBIT native council forms an explainable paper recommendation", () => {
  const workspace = emptyWorkspace();
  const strategy = {
    id: "native-supported",
    name: "Supported thesis",
    symbol: "ETH/USDC",
    timeframe: "4h" as const,
    thesis: "A thesis tested across independent datasets and parameters.",
    status: "review" as const,
    confidence: 75,
    entry: 100,
    stopLoss: 95,
    takeProfit: 110,
    riskPercent: 1,
    createdAt: "2026-10-12T12:00:00.000Z",
  };
  workspace.trading!.strategies.push(strategy);
  workspace.trading!.backtests = [0, 1, 2].map((index) => ({
    id: `bt-${index}`,
    strategyId: strategy.id,
    symbol: strategy.symbol,
    sourceName: `dataset-${index}.csv`,
    sourceHash: String(index + 1).repeat(64),
    algorithm: "sma-crossover-v1" as const,
    fastWindow: 10 + index * 5,
    slowWindow: 40 + index * 10,
    feeBps: 10,
    positionPercent: 10,
    bars: 1000,
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-06-01T00:00:00.000Z",
    startingBalance: 10000,
    endingBalance: 11200,
    netReturnPercent: 12,
    buyHoldReturnPercent: 5,
    maxDrawdownPercent: 5,
    winRate: 60,
    trades: 6,
    profitFactor: 2,
    testedAt: `2026-10-1${index + 1}T12:00:00.000Z`,
  }));
  const council = runOrbitCouncil(workspace.trading!, strategy, {
    id: "council-supported",
    generatedAt: "2026-10-12T13:00:00.000Z",
  });
  assert.equal(council.recommendation, "approve_paper");
  assert.ok(council.score >= 70);
  assert.ok(council.confidence >= 60);
  assert.equal(council.blockers.length, 0);
  assert.deepEqual(
    council.agents.map((agent) => agent.agent),
    ["scout", "strategist", "risk", "compliance", "executor", "auditor"],
  );
});

test("ORBIT missions preserve six-agent handoffs and owner authority", () => {
  const workspace = emptyWorkspace();
  const strategy = {
    id: "mission-supported",
    name: "Audited paper thesis",
    symbol: "ETH/USDC",
    timeframe: "4h" as const,
    thesis: "A bounded thesis backed by independent historical datasets.",
    status: "approved" as const,
    confidence: 78,
    entry: 100,
    stopLoss: 95,
    takeProfit: 110,
    riskPercent: 1,
    createdAt: "2026-10-12T12:00:00.000Z",
  };
  workspace.trading!.strategies.push(strategy);
  workspace.trading!.backtests = [0, 1, 2].map((index) => ({
    id: `mission-bt-${index}`,
    strategyId: strategy.id,
    symbol: strategy.symbol,
    sourceName: `dataset-${index}.csv`,
    sourceHash: String(index + 2).repeat(64),
    algorithm: "sma-crossover-v1" as const,
    fastWindow: 10 + index * 5,
    slowWindow: 40 + index * 10,
    feeBps: 10,
    positionPercent: 10,
    bars: 1000,
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-06-01T00:00:00.000Z",
    startingBalance: 10000,
    endingBalance: 11200,
    netReturnPercent: 12,
    buyHoldReturnPercent: 5,
    maxDrawdownPercent: 5,
    winRate: 60,
    trades: 6,
    profitFactor: 2,
    testedAt: `2026-10-1${index + 1}T12:00:00.000Z`,
  }));
  const generated = runOrbitCouncil(workspace.trading!, strategy, {
    id: "mission-council",
    generatedAt: "2026-10-12T13:00:00.000Z",
  });
  const council = { ...generated, ownerDecision: "accepted" as const };
  workspace.trading!.councilRuns.push(council);
  const mission = planAgentMission(
    workspace.trading!,
    strategy,
    council,
    "Challenge the stored evidence and prepare one bounded paper scenario.",
    {
      id: "mission-1",
      createdAt: "2026-10-12T14:00:00.000Z",
    },
  );

  assert.equal(mission.status, "owner_gate");
  assert.equal(mission.review.verdict, "pass");
  assert.equal(mission.ownerDecision, "pending");
  assert.deepEqual(
    mission.steps.map((step) => step.agent),
    ["scout", "strategist", "risk", "compliance", "executor", "auditor"],
  );
  assert.match(mission.steps[4].output, /paper-only/i);
  assert.match(mission.steps[4].output, /No live order route exists/i);

  const accepted = decideAgentMission(
    mission,
    "accepted",
    "2026-10-12T15:00:00.000Z",
  );
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.ownerDecision, "accepted");
});

test("ORBIT missions cannot bypass council evidence or the owner gate", () => {
  const workspace = emptyWorkspace();
  const strategy = {
    id: "mission-unproven",
    name: "Unproven mission",
    symbol: "BTC/USDC",
    timeframe: "4h" as const,
    thesis: "A thesis awaiting evidence.",
    status: "review" as const,
    confidence: 70,
    entry: 100,
    stopLoss: 95,
    takeProfit: 110,
    riskPercent: 1,
    createdAt: "2026-10-12T12:00:00.000Z",
  };
  workspace.trading!.strategies.push(strategy);
  const council = runOrbitCouncil(workspace.trading!, strategy, {
    id: "unproven-council",
    generatedAt: "2026-10-12T13:00:00.000Z",
  });
  workspace.trading!.councilRuns.push(council);
  const mission = planAgentMission(
    workspace.trading!,
    strategy,
    council,
    "Prepare a paper scenario without inventing missing evidence.",
    {
      id: "mission-2",
      createdAt: "2026-10-12T14:00:00.000Z",
    },
  );

  assert.equal(mission.status, "revision_required");
  assert.equal(mission.steps[4].state, "blocked");
  assert.throws(
    () => decideAgentMission(mission, "accepted", "2026-10-12T15:00:00.000Z"),
    /audit-passed mission/,
  );
  const rejected = decideAgentMission(
    mission,
    "rejected",
    "2026-10-12T15:00:00.000Z",
  );
  assert.equal(rejected.ownerDecision, "rejected");
});

test("older ORBIT workspaces gain empty council and mission memory on parse", () => {
  const workspace = emptyWorkspace();
  const legacyTrading = { ...workspace.trading } as Record<string, unknown>;
  delete legacyTrading.councilRuns;
  delete legacyTrading.agentMissions;
  const parsed = workspaceSchema.parse({
    ...workspace,
    trading: legacyTrading,
  });
  assert.deepEqual(parsed.trading?.councilRuns, []);
  assert.deepEqual(parsed.trading?.agentMissions, []);
});
test("refunds, costs and fees reduce margin and currencies remain separate", () => {
  const w = emptyWorkspace();
  w.receipts = [
    { ...receipt, status: "refunded", refund: 99 },
    { ...receipt, id: "cop", currency: "COP", gross: 900000 },
  ];
  assert.equal(metrics(w).collected, 100);
  assert.equal(metrics(w).margin, 54);
  assert.equal(metrics(w, "COP").collected, 900000);
});
test("paid receipts require evidence and refunds cannot exceed gross", () => {
  const w = emptyWorkspace();
  w.receipts = [{ ...receipt, reference: "" }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.receipts = [{ ...receipt, refund: 200 }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
});
test("invalid phone, orphan products, duplicates and fractional stock are rejected", () => {
  const w = emptyWorkspace();
  const b = {
    id: "b",
    name: "Cafe",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "",
  };
  w.businesses = [b];
  w.products = [
    {
      id: "p",
      businessId: "orphan",
      name: "Coffee",
      description: "",
      price: 12,
      cost: 4,
      stock: 3,
      image: "",
    },
  ];
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.products[0].businessId = "b";
  w.products[0].stock = 1.5;
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.products = [];
  w.businesses.push(b);
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.businesses = [{ ...b, phone: "not-a-phone" }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
});
test("catalog escapes supplied markup, omits costs and disables unavailable products", () => {
  const b = {
    id: "b",
    name: "<script>alert(1)</script>",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "A & B",
  };
  const html = catalogHTML(b, [
    {
      id: "p",
      businessId: "b",
      name: "<img onerror=x>",
      description: "",
      price: 12,
      cost: 4,
      stock: 0,
      image: "",
    },
  ]);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Currently unavailable"));
  assert.ok(!html.includes('data-product="p"'));
  assert.ok(!html.includes('"cost"'));
});

test("catalog cart exposes available products and composes one WhatsApp request", () => {
  const business = {
    id: "b",
    name: "Casa Verde",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "Coffee",
  };
  const html = catalogHTML(business, [
    {
      id: "p1",
      businessId: "b",
      name: "Morning box",
      description: "Coffee and pastry",
      price: 12,
      cost: 4,
      stock: 3,
      image: "",
    },
  ]);
  assert.match(html, /data-product="p1"/);
  assert.match(html, /Catalog subtotal/);
  assert.match(html, /https:\/\/wa\.me/);
  assert.ok(!html.includes('"cost":4'));
});

test("proposal exports a bounded draft without inventing agreement", () => {
  const workspace = emptyWorkspace();
  const html = proposalHTML(
    {
      id: "b",
      name: "ORBIT",
      category: "Services",
      phone: "12125550100",
      currency: "USD",
      description: "",
    },
    {
      id: "d",
      name: "Neighborhood Cafe",
      contact: "Owner",
      stage: "proposal",
      value: 199,
      nextAction: "Review scope",
      due: "",
      notes: "",
    },
    workspace.settings,
  );
  assert.match(html, /\$199\.00/);
  assert.match(html, /not an invoice or binding agreement/);
  assert.ok(!html.includes("undefined"));
});

test("close desk prioritizes overdue work and reports missing sales data", () => {
  const workspace = emptyWorkspace();
  workspace.deals = [
    {
      id: "later",
      name: "Later Cafe",
      contact: "Owner",
      stage: "contacted",
      value: 199,
      nextAction: "Review sample",
      due: "2026-10-20",
      notes: "Asked about updates",
      priority: "high",
    },
    {
      id: "overdue",
      name: "Overdue Bakery",
      contact: "",
      stage: "prospect",
      value: 199,
      nextAction: "",
      due: "2026-10-10",
      notes: "",
      priority: "low",
    },
  ];
  const queue = salesQueue(workspace, new Date("2026-10-11T12:00:00Z"));
  assert.equal(queue[0].deal.id, "overdue");
  assert.equal(queue[0].overdue, true);
  assert.deepEqual(
    dealReadiness(queue[0].deal, new Date("2026-10-11T12:00:00Z")).missing,
    ["contact", "next action"],
  );
});

test("follow-up assets are explicit, bounded and never claim automatic sending", () => {
  const workspace = emptyWorkspace();
  const deal = {
    id: "d",
    name: "Neighborhood Cafe",
    contact: "Maya",
    stage: "proposal" as const,
    value: 249,
    nextAction: "Review scope",
    due: "2026-10-15",
    notes: "",
    objection: "Needs owner approval",
  };
  const message = followUpText(deal, workspace.settings);
  const pack = outreachPack(deal, workspace.settings);
  assert.match(message, /Maya/);
  assert.match(message, /\$249\.00/);
  assert.match(pack, /No message has been sent automatically/);
  assert.match(pack, /Needs owner approval/);
});

test("proposal may expose configured seller actions without treating a link as payment", () => {
  const workspace = emptyWorkspace();
  workspace.settings.sellerPhone = "12125550100";
  workspace.settings.paymentLink = "https://pay.example/deposit";
  workspace.settings.depositPercent = 50;
  const html = proposalHTML(
    null,
    {
      id: "d",
      name: "Neighborhood Cafe",
      contact: "Owner",
      stage: "proposal",
      value: 200,
      nextAction: "Review scope",
      due: "",
      notes: "",
    },
    workspace.settings,
  );
  assert.match(html, /Proposed deposit: \$100\.00/);
  assert.match(html, /https:\/\/wa\.me\/12125550100/);
  assert.match(html, /https:\/\/pay\.example\/deposit/);
  assert.match(html, /does not confirm payment/);
  workspace.settings.paymentLink = "javascript:alert(1)";
  assert.equal(workspaceSchema.safeParse(workspace).success, false);
});

test("ORBIT readiness requires a won deal linked to real fulfillment facts", () => {
  const workspace = emptyWorkspace();
  workspace.businesses = [
    {
      id: "b1",
      name: "Casa Verde",
      category: "Cafe",
      phone: "12125550100",
      currency: "USD",
      description: "Neighborhood coffee and pastries.",
    },
  ];
  workspace.products = [
    {
      id: "p1",
      businessId: "b1",
      name: "Coffee box",
      description: "Six pastries and house coffee.",
      price: 38,
      cost: 16,
      stock: 8,
      image: "",
    },
  ];
  const deal = {
    id: "d1",
    name: "Casa Verde launch",
    contact: "Maya",
    stage: "won" as const,
    value: 199,
    nextAction: "Prepare launch kit",
    due: "2026-10-15",
    notes: "Catalog, three scripts and handoff approved.",
    businessId: "b1",
  };
  workspace.deals = [deal];
  workspace.receipts = [
    {
      ...receipt,
      id: "deposit",
      label: "Deposit",
      gross: 99.5,
      dealId: "d1",
    },
  ];
  assert.equal(orbitReadiness(workspace, deal).ready, true);
  const handoff = orbitHandoff(workspace, deal);
  assert.match(handoff, /Ready for controlled production/);
  assert.match(handoff, /Coffee box/);
  assert.match(handoff, /Nothing .* automatically/i);
});

test("workspace rejects an opportunity linked to a missing business", () => {
  const workspace = emptyWorkspace();
  workspace.deals = [
    {
      id: "d1",
      name: "Orphan opportunity",
      contact: "Owner",
      stage: "won",
      value: 199,
      nextAction: "Deliver",
      due: "",
      notes: "Approved",
      businessId: "missing",
    },
  ];
  assert.equal(workspaceSchema.safeParse(workspace).success, false);
});

test("ORBIT does not unlock delivery for a pending or unlinked payment", () => {
  const workspace = emptyWorkspace();
  const deal = {
    id: "d1",
    name: "Paid launch",
    contact: "Owner",
    stage: "won" as const,
    value: 199,
    nextAction: "Deliver",
    due: "",
    notes: "Approved scope",
  };
  workspace.deals = [deal];
  workspace.receipts = [
    {
      ...receipt,
      status: "pending",
      reference: "",
      dealId: "d1",
    },
  ];
  assert.equal(orbitReadiness(workspace, deal).ready, false);
  assert.ok(
    orbitReadiness(workspace, deal).blockers.includes(
      "verify a deposit or payment",
    ),
  );
  workspace.receipts[0] = { ...receipt, dealId: "missing" };
  assert.equal(workspaceSchema.safeParse(workspace).success, false);
});
