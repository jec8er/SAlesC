import { z } from "zod";
const text = z.string().trim().min(1).max(180);
const money = z.number().finite().min(0).max(100000000);
export const businessSchema = z
  .object({
    id: text,
    name: text,
    category: text,
    phone: z
      .string()
      .regex(/^\d{8,15}$/, "Use 8–15 digits, including country code"),
    currency: z.enum(["USD", "COP"]),
    description: z.string().max(600),
  })
  .strict();
export const productSchema = z
  .object({
    id: text,
    businessId: text,
    name: text,
    description: z.string().max(600),
    price: money,
    cost: money,
    stock: z.number().int().min(0).max(100000),
    image: z
      .string()
      .max(2000)
      .refine((v) => !v || /^https:\/\//.test(v), "Use an HTTPS image URL"),
  })
  .strict();
export const dealSchema = z
  .object({
    id: text,
    name: text,
    contact: z.string().max(180),
    stage: z.enum(["prospect", "contacted", "proposal", "won", "lost"]),
    value: money,
    nextAction: z.string().max(400),
    due: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(1000),
    source: z
      .enum([
        "referral",
        "walk-in",
        "social",
        "marketplace",
        "outbound",
        "other",
      ])
      .optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    lastContact: z
      .string()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    objection: z.string().max(400).optional(),
    businessId: z.string().max(180).optional(),
  })
  .strict();
export const receiptSchema = z
  .object({
    id: text,
    label: text,
    kind: z.enum(["service", "product"]),
    currency: z.enum(["USD", "COP"]),
    gross: money,
    cost: money,
    fees: money,
    refund: money,
    status: z.enum(["pending", "paid", "refunded"]),
    reference: z.string().max(180),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dealId: z.string().max(180).optional(),
  })
  .strict()
  .superRefine((r, c) => {
    if (r.status !== "pending" && !r.reference.trim())
      c.addIssue({
        code: "custom",
        message: "A payment reference is required",
        path: ["reference"],
      });
    if (r.refund > r.gross)
      c.addIssue({
        code: "custom",
        message: "Refund cannot exceed gross",
        path: ["refund"],
      });
    if (r.status === "refunded" && r.refund === 0)
      c.addIssue({
        code: "custom",
        message: "Enter the refunded amount",
        path: ["refund"],
      });
    if (r.status === "pending" && r.refund)
      c.addIssue({
        code: "custom",
        message: "Pending payments cannot have refunds",
        path: ["refund"],
      });
  });

export const strategySchema = z
  .object({
    id: text,
    name: text,
    symbol: z
      .string()
      .trim()
      .min(2)
      .max(24)
      .regex(/^[A-Z0-9/_-]+$/),
    timeframe: z.enum(["15m", "1h", "4h", "1d"]),
    thesis: z.string().trim().min(1).max(1200),
    status: z.enum(["draft", "review", "approved", "paused"]),
    confidence: z.number().int().min(0).max(100),
    entry: money,
    stopLoss: money,
    takeProfit: money,
    riskPercent: z.number().min(0.1).max(5),
    createdAt: z.string().datetime(),
  })
  .strict()
  .superRefine((strategy, context) => {
    if (strategy.stopLoss >= strategy.entry)
      context.addIssue({
        code: "custom",
        message: "Stop loss must be below entry for long strategies",
        path: ["stopLoss"],
      });
    if (strategy.takeProfit <= strategy.entry)
      context.addIssue({
        code: "custom",
        message: "Take profit must be above entry for long strategies",
        path: ["takeProfit"],
      });
  });

export const paperTradeSchema = z
  .object({
    id: text,
    strategyId: text,
    symbol: z.string().trim().min(2).max(24),
    side: z.literal("long"),
    status: z.enum(["open", "closed"]),
    entry: money,
    mark: money,
    quantity: z.number().finite().positive().max(100000000),
    riskAmount: money,
    pnl: z.number().finite().min(-100000000).max(100000000),
    openedAt: z.string().datetime(),
    closedAt: z.string().datetime().optional(),
  })
  .strict();

export const agentEventSchema = z
  .object({
    id: text,
    agent: z.enum([
      "scout",
      "strategist",
      "risk",
      "compliance",
      "executor",
      "auditor",
    ]),
    status: z.enum([
      "observed",
      "proposed",
      "approved",
      "blocked",
      "simulated",
    ]),
    message: z.string().trim().min(1).max(600),
    timestamp: z.string().datetime(),
  })
  .strict();

export const backtestResultSchema = z
  .object({
    id: text,
    strategyId: text,
    symbol: z.string().trim().min(2).max(24),
    sourceName: z.string().trim().min(1).max(180),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    algorithm: z.literal("sma-crossover-v1"),
    fastWindow: z.number().int().min(2).max(500),
    slowWindow: z.number().int().min(3).max(1000),
    feeBps: z.number().int().min(0).max(500),
    positionPercent: z.number().min(0.1).max(25),
    bars: z.number().int().min(30).max(50000),
    from: z.string().datetime(),
    to: z.string().datetime(),
    startingBalance: z.number().finite().min(100).max(100000000),
    endingBalance: z.number().finite().min(0).max(1000000000),
    netReturnPercent: z.number().finite().min(-100).max(1000000),
    buyHoldReturnPercent: z.number().finite().min(-100).max(1000000),
    maxDrawdownPercent: z.number().finite().min(0).max(100),
    winRate: z.number().finite().min(0).max(100),
    trades: z.number().int().min(0).max(50000),
    profitFactor: z.number().finite().min(0).max(1000000),
    testedAt: z.string().datetime(),
  })
  .strict()
  .refine((result) => result.fastWindow < result.slowWindow, {
    message: "Fast window must be smaller than slow window",
    path: ["fastWindow"],
  });

export const councilRunSchema = z
  .object({
    id: text,
    strategyId: text,
    engineVersion: z.literal("orbit-intelligence-v1"),
    recommendation: z.enum(["approve_paper", "revise", "observe", "reject"]),
    score: z.number().int().min(0).max(100),
    confidence: z.number().int().min(0).max(100),
    consensus: z.number().int().min(0).max(100),
    summary: z.string().trim().min(1).max(1000),
    blockers: z.array(z.string().trim().min(1).max(240)).max(20),
    agents: z
      .array(
        z
          .object({
            agent: z.enum([
              "scout",
              "strategist",
              "risk",
              "compliance",
              "executor",
              "auditor",
            ]),
            verdict: z.enum(["support", "concern", "block"]),
            score: z.number().int().min(0).max(100),
            rationale: z.string().trim().min(1).max(600),
          })
          .strict(),
      )
      .length(6),
    evidence: z
      .object({
        backtestIds: z.array(text).max(50),
        paperTradeIds: z.array(text).max(200),
        totalBars: z.number().int().min(0).max(2500000),
        totalTrades: z.number().int().min(0).max(2500000),
        datasetFingerprints: z.number().int().min(0).max(50),
        priorCouncilRuns: z.number().int().min(0).max(1000),
      })
      .strict(),
    ownerDecision: z.enum(["pending", "accepted", "rejected"]),
    generatedAt: z.string().datetime(),
  })
  .strict();

export const tradingSchema = z
  .object({
    mode: z.literal("paper"),
    startingBalance: z.number().finite().min(100).max(100000000),
    maxDailyLossPercent: z.number().min(0.1).max(10),
    maxPositionPercent: z.number().min(0.1).max(25),
    liveExecutionLocked: z.literal(true),
    strategies: z.array(strategySchema).max(250),
    paperTrades: z.array(paperTradeSchema).max(2000),
    backtests: z.array(backtestResultSchema).max(1000).default([]),
    councilRuns: z.array(councilRunSchema).max(1000).default([]),
    events: z.array(agentEventSchema).max(5000),
  })
  .strict()
  .superRefine((trading, context) => {
    const collections = [
      ["strategies", trading.strategies],
      ["paperTrades", trading.paperTrades],
      ["backtests", trading.backtests],
      ["councilRuns", trading.councilRuns],
      ["events", trading.events],
    ] as const;
    for (const [name, records] of collections) {
      const ids = records.map((record) => record.id);
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          message: `Duplicate ${name} identifiers`,
          path: [name],
        });
    }
    const strategyIds = new Set(
      trading.strategies.map((strategy) => strategy.id),
    );
    if (trading.paperTrades.some((trade) => !strategyIds.has(trade.strategyId)))
      context.addIssue({
        code: "custom",
        message: "A paper trade must reference an existing strategy",
        path: ["paperTrades"],
      });
    if (trading.backtests.some((result) => !strategyIds.has(result.strategyId)))
      context.addIssue({
        code: "custom",
        message: "A backtest must reference an existing strategy",
        path: ["backtests"],
      });
    if (trading.councilRuns.some((run) => !strategyIds.has(run.strategyId)))
      context.addIssue({
        code: "custom",
        message: "A council run must reference an existing strategy",
        path: ["councilRuns"],
      });
  });

export type TradingWorkspace = z.infer<typeof tradingSchema>;
export const emptyTradingWorkspace = (): TradingWorkspace => ({
  mode: "paper",
  startingBalance: 10000,
  maxDailyLossPercent: 2,
  maxPositionPercent: 10,
  liveExecutionLocked: true,
  strategies: [],
  paperTrades: [],
  backtests: [],
  councilRuns: [],
  events: [],
});

export const workspaceSchema = z
  .object({
    businesses: z.array(businessSchema).max(100),
    products: z.array(productSchema).max(1000),
    deals: z.array(dealSchema).max(1000),
    receipts: z.array(receiptSchema).max(1000),
    trading: tradingSchema.optional(),
    settings: z
      .object({
        setupPrice: money,
        monthlyPrice: money,
        target: money,
        currency: z.enum(["USD", "COP"]),
        sellerName: z.string().trim().max(180).optional(),
        sellerPhone: z
          .string()
          .regex(/^$|^\d{8,15}$/, "Use 8–15 digits, including country code")
          .optional(),
        sellerEmail: z
          .string()
          .trim()
          .max(254)
          .refine(
            (value) => !value || z.string().email().safeParse(value).success,
            "Use a valid email address",
          )
          .optional(),
        paymentLink: z
          .string()
          .trim()
          .max(2000)
          .refine(
            (value) => !value || /^https:\/\//.test(value),
            "Use an HTTPS payment link",
          )
          .optional(),
        offerName: z.string().trim().max(180).optional(),
        offerPromise: z.string().trim().max(400).optional(),
        depositPercent: z.number().int().min(0).max(100).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((w, c) => {
    for (const key of [
      "businesses",
      "products",
      "deals",
      "receipts",
    ] as const) {
      const ids = w[key].map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate identifiers",
          path: [key],
        });
    }
    const ids = new Set(w.businesses.map((x) => x.id));
    if (w.products.some((p) => !ids.has(p.businessId)))
      c.addIssue({
        code: "custom",
        message: "A product must belong to a business",
        path: ["products"],
      });
    if (w.deals.some((deal) => deal.businessId && !ids.has(deal.businessId)))
      c.addIssue({
        code: "custom",
        message: "An opportunity must reference an existing business",
        path: ["deals"],
      });
    const dealIds = new Set(w.deals.map((deal) => deal.id));
    if (
      w.receipts.some(
        (receipt) => receipt.dealId && !dealIds.has(receipt.dealId),
      )
    )
      c.addIssue({
        code: "custom",
        message: "A payment must reference an existing opportunity",
        path: ["receipts"],
      });
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export type Business = z.infer<typeof businessSchema>;
export type Product = z.infer<typeof productSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type Strategy = z.infer<typeof strategySchema>;
export type PaperTrade = z.infer<typeof paperTradeSchema>;
export type AgentEvent = z.infer<typeof agentEventSchema>;
export type BacktestResult = z.infer<typeof backtestResultSchema>;
export type CouncilRun = z.infer<typeof councilRunSchema>;
export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export const emptyWorkspace = (): Workspace => ({
  businesses: [],
  products: [],
  deals: [],
  receipts: [],
  trading: emptyTradingWorkspace(),
  settings: {
    setupPrice: 199,
    monthlyPrice: 39,
    target: 1000,
    currency: "USD",
    sellerName: "ORBIT",
    sellerPhone: "",
    sellerEmail: "",
    paymentLink: "",
    offerName: "Direct Commerce Launch",
    offerPromise:
      "A clear direct-order catalog, launch content and an owner handoff.",
    depositPercent: 50,
  },
});

export function tradingState(workspace: Workspace): TradingWorkspace {
  return workspace.trading || emptyTradingWorkspace();
}

export function strategyRisk(
  strategy: Strategy,
  balance: number,
  maxPositionPercent: number,
) {
  const distance = strategy.entry - strategy.stopLoss;
  const requestedRisk = balance * (strategy.riskPercent / 100);
  const quantityByRisk = distance > 0 ? requestedRisk / distance : 0;
  const maxNotional = balance * (maxPositionPercent / 100);
  const quantityByPosition =
    strategy.entry > 0 ? maxNotional / strategy.entry : 0;
  const quantity = Math.max(0, Math.min(quantityByRisk, quantityByPosition));
  const notional = quantity * strategy.entry;
  const riskAmount = quantity * distance;
  const rewardAmount = quantity * (strategy.takeProfit - strategy.entry);
  return {
    quantity,
    notional,
    riskAmount,
    rewardAmount,
    rewardToRisk: riskAmount > 0 ? rewardAmount / riskAmount : 0,
  };
}

export function paperMetrics(trading: TradingWorkspace) {
  const realizedPnl = trading.paperTrades
    .filter((trade) => trade.status === "closed")
    .reduce((total, trade) => total + trade.pnl, 0);
  const unrealizedPnl = trading.paperTrades
    .filter((trade) => trade.status === "open")
    .reduce((total, trade) => total + trade.pnl, 0);
  const closed = trading.paperTrades.filter(
    (trade) => trade.status === "closed",
  );
  const wins = closed.filter((trade) => trade.pnl > 0).length;
  return {
    equity: trading.startingBalance + realizedPnl + unrealizedPnl,
    realizedPnl,
    unrealizedPnl,
    openRisk: trading.paperTrades
      .filter((trade) => trade.status === "open")
      .reduce((total, trade) => total + trade.riskAmount, 0),
    winRate: closed.length ? (wins / closed.length) * 100 : 0,
    closedTrades: closed.length,
  };
}

export function parseCandleCSV(input: string): Candle[] {
  const lines = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 31)
    throw Error("CSV needs a header and at least 30 candles");
  if (lines.length > 50001) throw Error("CSV is limited to 50,000 candles");
  const headers = lines[0]
    .split(",")
    .map((value) => value.trim().toLowerCase());
  const required = ["timestamp", "open", "high", "low", "close"];
  const indexes = Object.fromEntries(
    required.map((name) => [name, headers.indexOf(name)]),
  ) as Record<(typeof required)[number], number>;
  if (required.some((name) => indexes[name] < 0))
    throw Error(
      "CSV headers must include timestamp, open, high, low and close",
    );
  const volumeIndex = headers.indexOf("volume");
  const candles = lines.slice(1).map((line, row) => {
    const cells = line.split(",").map((value) => value.trim());
    const rawTimestamp = cells[indexes.timestamp];
    const numericTimestamp = Number(rawTimestamp);
    const time = /^\d{10,13}$/.test(rawTimestamp)
      ? numericTimestamp * (rawTimestamp.length === 10 ? 1000 : 1)
      : Date.parse(rawTimestamp);
    const numberAt = (index: number) => Number(cells[index]);
    if (!Number.isFinite(time))
      throw Error(`Invalid candle on CSV row ${row + 2}`);
    const candle: Candle = {
      timestamp: new Date(time).toISOString(),
      open: numberAt(indexes.open),
      high: numberAt(indexes.high),
      low: numberAt(indexes.low),
      close: numberAt(indexes.close),
      volume: volumeIndex >= 0 ? numberAt(volumeIndex) : 0,
    };
    if (
      ![candle.open, candle.high, candle.low, candle.close].every(
        (value) => Number.isFinite(value) && value > 0,
      ) ||
      !Number.isFinite(candle.volume) ||
      candle.volume < 0 ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close) ||
      candle.low > candle.high
    )
      throw Error(`Invalid candle on CSV row ${row + 2}`);
    return candle;
  });
  for (let index = 1; index < candles.length; index += 1)
    if (candles[index].timestamp <= candles[index - 1].timestamp)
      throw Error("Candles must be in strictly increasing time order");
  return candles;
}

export function runSMABacktest(
  candles: Candle[],
  options: {
    startingBalance: number;
    fastWindow: number;
    slowWindow: number;
    feeBps: number;
    positionPercent: number;
  },
) {
  const { startingBalance, fastWindow, slowWindow, feeBps, positionPercent } =
    options;
  if (candles.length < Math.max(30, slowWindow + 2))
    throw Error("Not enough candles for the selected slow window");
  if (!Number.isInteger(fastWindow) || !Number.isInteger(slowWindow))
    throw Error("Moving-average windows must be whole numbers");
  if (fastWindow < 2 || slowWindow <= fastWindow || slowWindow > 1000)
    throw Error("Use windows where 2 ≤ fast < slow ≤ 1000");
  if (feeBps < 0 || feeBps > 500)
    throw Error("Fee must be between 0 and 500 basis points");
  if (positionPercent <= 0 || positionPercent > 25)
    throw Error("Position size must be between 0 and 25 percent");
  if (startingBalance < 100)
    throw Error("Starting balance must be at least 100");

  const closes = candles.map((candle) => candle.close);
  const average = (window: number) => {
    const values = Array<number | undefined>(candles.length).fill(undefined);
    let sum = 0;
    for (let index = 0; index < closes.length; index += 1) {
      sum += closes[index];
      if (index >= window) sum -= closes[index - window];
      if (index >= window - 1) values[index] = sum / window;
    }
    return values;
  };
  const fast = average(fastWindow);
  const slow = average(slowWindow);
  const feeRate = feeBps / 10000;
  let balance = startingBalance;
  let peak = startingBalance;
  let maxDrawdownPercent = 0;
  let position: { entry: number; quantity: number; entryFee: number } | null =
    null;
  let pending: "enter" | "exit" | null = null;
  const returns: number[] = [];

  for (let index = slowWindow; index < candles.length; index += 1) {
    const candle = candles[index];
    if (pending === "enter" && !position) {
      const notional = balance * (positionPercent / 100);
      position = {
        entry: candle.open,
        quantity: notional / candle.open,
        entryFee: notional * feeRate,
      };
    } else if (pending === "exit" && position) {
      const exitValue = candle.open * position.quantity;
      const pnl =
        (candle.open - position.entry) * position.quantity -
        position.entryFee -
        exitValue * feeRate;
      balance += pnl;
      returns.push(pnl);
      position = null;
    }
    pending = null;

    const markedEquity = position
      ? balance +
        (candle.close - position.entry) * position.quantity -
        position.entryFee -
        candle.close * position.quantity * feeRate
      : balance;
    peak = Math.max(peak, markedEquity);
    maxDrawdownPercent = Math.max(
      maxDrawdownPercent,
      peak > 0 ? ((peak - markedEquity) / peak) * 100 : 0,
    );
    const previousFast = fast[index - 1];
    const previousSlow = slow[index - 1];
    const currentFast = fast[index];
    const currentSlow = slow[index];
    if (
      !position &&
      previousFast !== undefined &&
      previousSlow !== undefined &&
      currentFast !== undefined &&
      currentSlow !== undefined &&
      previousFast <= previousSlow &&
      currentFast > currentSlow
    )
      pending = "enter";
    else if (
      position &&
      previousFast !== undefined &&
      previousSlow !== undefined &&
      currentFast !== undefined &&
      currentSlow !== undefined &&
      previousFast >= previousSlow &&
      currentFast < currentSlow
    )
      pending = "exit";
  }
  if (position) {
    const last = candles.at(-1)!;
    const exitValue = last.close * position.quantity;
    const pnl =
      (last.close - position.entry) * position.quantity -
      position.entryFee -
      exitValue * feeRate;
    balance += pnl;
    returns.push(pnl);
  }
  const wins = returns.filter((value) => value > 0);
  const losses = returns.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  return {
    endingBalance: balance,
    netReturnPercent: ((balance - startingBalance) / startingBalance) * 100,
    buyHoldReturnPercent:
      ((candles.at(-1)!.close - candles[0].open) / candles[0].open) * 100,
    maxDrawdownPercent: Math.min(100, maxDrawdownPercent),
    winRate: returns.length ? (wins.length / returns.length) * 100 : 0,
    trades: returns.length,
    profitFactor: grossLoss
      ? grossProfit / grossLoss
      : grossProfit
        ? 1000000
        : 0,
  };
}

const boundedScore = (value: number) =>
  Math.round(Math.max(0, Math.min(100, value)));

export function runOrbitCouncil(
  trading: TradingWorkspace,
  strategy: Strategy,
  identity: { id: string; generatedAt: string },
): CouncilRun {
  const backtests = trading.backtests
    .filter((result) => result.strategyId === strategy.id)
    .sort((left, right) => right.testedAt.localeCompare(left.testedAt))
    .slice(0, 10);
  const paperTrades = trading.paperTrades.filter(
    (trade) => trade.strategyId === strategy.id && trade.status === "closed",
  );
  const priorRuns = trading.councilRuns.filter(
    (run) => run.strategyId === strategy.id,
  );
  const average = (values: number[]) =>
    values.length
      ? values.reduce((total, value) => total + value, 0) / values.length
      : 0;
  const totalBars = backtests.reduce((total, result) => total + result.bars, 0);
  const totalTrades = backtests.reduce(
    (total, result) => total + result.trades,
    0,
  );
  const averageReturn = average(
    backtests.map((result) => result.netReturnPercent),
  );
  const averageBenchmark = average(
    backtests.map((result) => result.buyHoldReturnPercent),
  );
  const averageDrawdown = average(
    backtests.map((result) => result.maxDrawdownPercent),
  );
  const averageProfitFactor = average(
    backtests.map((result) => Math.min(5, result.profitFactor)),
  );
  const positiveRuns = backtests.filter(
    (result) => result.netReturnPercent > 0,
  ).length;
  const fingerprints = new Set(backtests.map((result) => result.sourceHash));
  const parameterSets = new Set(
    backtests.map(
      (result) => `${result.fastWindow}/${result.slowWindow}/${result.feeBps}`,
    ),
  );
  const acceptedMemory = priorRuns.filter(
    (run) => run.ownerDecision === "accepted",
  ).length;
  const rejectedMemory = priorRuns.filter(
    (run) => run.ownerDecision === "rejected",
  ).length;
  const paperPnl = paperTrades.reduce((total, trade) => total + trade.pnl, 0);

  const scoutScore = boundedScore(
    20 +
      Math.min(35, totalBars / 200) +
      Math.min(25, backtests.length * 8) +
      Math.min(20, fingerprints.size * 8),
  );
  const strategistScore = boundedScore(
    45 +
      averageReturn * 1.2 +
      (averageReturn - averageBenchmark) * 0.6 +
      (averageProfitFactor - 1) * 12 +
      Math.min(8, parameterSets.size * 2),
  );
  const riskScore = boundedScore(
    96 - averageDrawdown * 2.1 - strategy.riskPercent * 4,
  );
  const complianceScore = boundedScore(
    (backtests.length ? 50 : 10) +
      Math.min(20, backtests.length * 8) +
      Math.min(20, fingerprints.size * 10) +
      (backtests.every((result) => result.feeBps > 0) ? 10 : 0),
  );
  const executorScore = boundedScore(
    paperTrades.length
      ? 50 + Math.min(30, paperPnl / 10) + Math.min(20, paperTrades.length * 3)
      : 45,
  );
  const consistency = backtests.length
    ? (positiveRuns / backtests.length) * 100
    : 0;
  const auditorScore = boundedScore(
    20 +
      consistency * 0.45 +
      Math.min(20, parameterSets.size * 6) +
      Math.min(10, acceptedMemory * 2) -
      Math.min(20, rejectedMemory * 4),
  );

  const hardBlockers = [
    !backtests.length ? "No historical backtest evidence is linked." : "",
    totalTrades < 3 ? "Fewer than three historical trades were observed." : "",
    backtests.some((result) => result.maxDrawdownPercent > 35)
      ? "At least one backtest exceeded 35% drawdown."
      : "",
    strategy.riskPercent > trading.maxDailyLossPercent
      ? "Strategy risk exceeds the owner's daily loss policy."
      : "",
  ].filter(Boolean);
  const agents: CouncilRun["agents"] = [
    {
      agent: "scout",
      verdict: !backtests.length
        ? "block"
        : scoutScore >= 60
          ? "support"
          : "concern",
      score: scoutScore,
      rationale: backtests.length
        ? `${backtests.length} runs cover ${totalBars.toLocaleString()} candles across ${fingerprints.size} dataset fingerprint${fingerprints.size === 1 ? "" : "s"}.`
        : "No historical dataset has been tested, so market evidence is absent.",
    },
    {
      agent: "strategist",
      verdict:
        !backtests.length || strategistScore < 35
          ? "block"
          : strategistScore >= 60
            ? "support"
            : "concern",
      score: strategistScore,
      rationale: backtests.length
        ? `Average return is ${averageReturn.toFixed(2)}% versus ${averageBenchmark.toFixed(2)}% buy-and-hold; average capped profit factor is ${averageProfitFactor.toFixed(2)}.`
        : "The thesis has not produced measurable historical results.",
    },
    {
      agent: "risk",
      verdict:
        averageDrawdown > 35 ||
        strategy.riskPercent > trading.maxDailyLossPercent
          ? "block"
          : riskScore >= 60
            ? "support"
            : "concern",
      score: riskScore,
      rationale: `Average drawdown is ${averageDrawdown.toFixed(2)}%; requested risk is ${strategy.riskPercent.toFixed(1)}% against a ${trading.maxDailyLossPercent.toFixed(1)}% daily limit.`,
    },
    {
      agent: "compliance",
      verdict: !backtests.length
        ? "block"
        : complianceScore >= 65
          ? "support"
          : "concern",
      score: complianceScore,
      rationale: backtests.length
        ? `${backtests.length} auditable summaries include dataset fingerprints; ${backtests.filter((result) => result.feeBps > 0).length} include non-zero fees.`
        : "There is no auditable test record to review.",
    },
    {
      agent: "executor",
      verdict: executorScore >= 60 ? "support" : "concern",
      score: executorScore,
      rationale: paperTrades.length
        ? `${paperTrades.length} closed paper scenarios produced ${moneyLabel(paperPnl)} modeled P&L.`
        : "No closed paper scenario exists yet; execution confidence remains neutral.",
    },
    {
      agent: "auditor",
      verdict: auditorScore >= 60 ? "support" : "concern",
      score: auditorScore,
      rationale: `${positiveRuns}/${backtests.length} historical runs were positive across ${parameterSets.size} parameter set${parameterSets.size === 1 ? "" : "s"}; memory contains ${acceptedMemory} accepted and ${rejectedMemory} rejected prior decisions.`,
    },
  ];
  const score = boundedScore(average(agents.map((agent) => agent.score)));
  const dispersion = average(
    agents.map((agent) => Math.abs(agent.score - score)),
  );
  const consensus = boundedScore(100 - dispersion * 1.8);
  const confidence = boundedScore(
    20 +
      Math.min(25, backtests.length * 8) +
      Math.min(25, totalTrades * 2) +
      Math.min(20, totalBars / 500) +
      Math.min(10, priorRuns.length * 2),
  );
  const recommendation: CouncilRun["recommendation"] = hardBlockers.length
    ? backtests.length
      ? "reject"
      : "observe"
    : score >= 70 && confidence >= 60 && consensus >= 65
      ? "approve_paper"
      : score >= 50
        ? "revise"
        : "reject";
  const summary =
    recommendation === "approve_paper"
      ? `Evidence supports controlled paper testing at the owner's current limits. Score ${score}/100 with ${confidence}% evidence confidence.`
      : recommendation === "revise"
        ? `The strategy has partial support but needs stronger or more consistent evidence. Score ${score}/100 with ${confidence}% evidence confidence.`
        : recommendation === "observe"
          ? "ORBIT needs historical evidence before forming a strategy recommendation."
          : `ORBIT does not support paper approval under the current evidence and limits. Score ${score}/100.`;
  return councilRunSchema.parse({
    ...identity,
    strategyId: strategy.id,
    engineVersion: "orbit-intelligence-v1",
    recommendation,
    score,
    confidence,
    consensus,
    summary,
    blockers: hardBlockers,
    agents,
    evidence: {
      backtestIds: backtests.map((result) => result.id),
      paperTradeIds: paperTrades.map((trade) => trade.id),
      totalBars,
      totalTrades,
      datasetFingerprints: fingerprints.size,
      priorCouncilRuns: priorRuns.length,
    },
    ownerDecision: "pending",
  });
}
export function metrics(w: Workspace, currency = w.settings.currency) {
  const paid = w.receipts.filter(
    (r) => r.status !== "pending" && r.currency === currency,
  );
  const sum = (f: (r: (typeof paid)[number]) => number) =>
    paid.reduce((a, r) => a + f(r), 0);
  return {
    collected: sum((r) => r.gross - r.refund),
    margin: sum((r) => r.gross - r.refund - r.cost - r.fees),
    pending: w.receipts
      .filter((r) => r.status === "pending" && r.currency === currency)
      .reduce((a, r) => a + r.gross, 0),
    pipeline: w.deals
      .filter((d) => !["won", "lost"].includes(d.stage))
      .reduce((a, d) => a + d.value, 0),
    count: paid.length,
  };
}
export function moneyLabel(n: number, currency = "USD") {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(n);
}

export function dealReadiness(deal: Deal, today = new Date()) {
  if (deal.stage === "won")
    return { score: 100, overdue: false, missing: [] as string[] };
  if (deal.stage === "lost")
    return { score: 0, overdue: false, missing: [] as string[] };
  const missing: string[] = [];
  let score = { prospect: 10, contacted: 25, proposal: 45 }[deal.stage];
  if (deal.contact.trim()) score += 15;
  else missing.push("contact");
  if (deal.nextAction.trim()) score += 20;
  else missing.push("next action");
  if (deal.due) score += 10;
  else missing.push("follow-up date");
  if (deal.notes.trim()) score += 5;
  if (deal.lastContact) score += 5;
  if (deal.objection?.trim()) score += 5;
  const day = today.toISOString().slice(0, 10);
  return {
    score: Math.min(100, score),
    overdue: Boolean(deal.due && deal.due < day),
    missing,
  };
}

export function salesQueue(workspace: Workspace, today = new Date()) {
  const day = today.toISOString().slice(0, 10);
  const priority = { high: 0, medium: 1, low: 2 } as const;
  return workspace.deals
    .filter((deal) => !["won", "lost"].includes(deal.stage))
    .map((deal) => ({ deal, ...dealReadiness(deal, today) }))
    .sort((a, b) => {
      const dueA = a.deal.due || "9999-12-31";
      const dueB = b.deal.due || "9999-12-31";
      return (
        Number(dueA >= day) - Number(dueB >= day) ||
        dueA.localeCompare(dueB) ||
        priority[a.deal.priority || "medium"] -
          priority[b.deal.priority || "medium"] ||
        b.score - a.score
      );
    });
}

export function followUpText(deal: Deal, settings: Workspace["settings"]) {
  const seller = settings.sellerName || "ORBIT";
  const offer = settings.offerName || "Direct Commerce Launch";
  const promise =
    settings.offerPromise ||
    "a clear direct-order catalog, launch content and an owner handoff";
  const greeting = deal.contact.trim() || deal.name;
  if (deal.stage === "proposal")
    return `Hi ${greeting} — this is ${seller}. I wanted to follow up on the ${offer} proposal. The proposed scope is ${promise.toLowerCase()} for ${moneyLabel(deal.value || settings.setupPrice, settings.currency)}. Would you like to review the scope together or decide on the next step?`;
  if (deal.stage === "contacted")
    return `Hi ${greeting} — thank you for the conversation. Based on what we discussed, ${offer} is designed to deliver ${promise.toLowerCase()}. The next useful step is ${deal.nextAction || "a short scope review"}. What time works for you?`;
  return `Hi ${greeting} — I’m ${seller}. I help independent businesses with ${promise.toLowerCase()} through ${offer}. I’d like to understand how customers order from ${deal.name} today and whether a simpler direct-order flow would be useful. Would you be open to a short conversation?`;
}

export function outreachPack(deal: Deal, settings: Workspace["settings"]) {
  const first = followUpText(deal, settings);
  const seller = settings.sellerName || "ORBIT";
  return `SALES FOLLOW-UP PACK — ${deal.name}\n\n1. CURRENT MESSAGE\n${first}\n\n2. VALUE FOLLOW-UP (2 BUSINESS DAYS LATER)\nHi ${deal.contact || deal.name} — following up from ${seller}. The goal is not to add more software; it is to make the offer, ordering path and handoff clearer. Is this still worth reviewing?\n\n3. CLOSE THE LOOP (5 BUSINESS DAYS LATER)\nHi ${deal.contact || deal.name} — I’m closing the loop on this for now. If improving the direct-order experience becomes a priority, reply here and I’ll reopen the scope.\n\nInternal next action: ${deal.nextAction || "Choose a specific next action before sending."}\n${deal.objection ? `Known objection: ${deal.objection}\n` : ""}No message has been sent automatically.`;
}

export function orbitReadiness(workspace: Workspace, deal: Deal) {
  const business = workspace.businesses.find(
    (item) => item.id === deal.businessId,
  );
  const products = business
    ? workspace.products.filter((item) => item.businessId === business.id)
    : [];
  const collected = workspace.receipts
    .filter(
      (receipt) =>
        receipt.dealId === deal.id &&
        receipt.status === "paid" &&
        receipt.currency === workspace.settings.currency,
    )
    .reduce((total, receipt) => total + receipt.gross - receipt.refund, 0);
  const blockers: string[] = [];
  if (deal.stage !== "won") blockers.push("mark the opportunity won");
  if (!business) blockers.push("link a business");
  if (!products.length) blockers.push("add at least one real product");
  if (!deal.contact.trim()) blockers.push("record the client contact");
  if (!deal.notes.trim()) blockers.push("record approved scope notes");
  if (collected <= 0) blockers.push("verify a deposit or payment");
  return {
    business,
    products,
    collected,
    blockers,
    ready: blockers.length === 0,
    score: Math.round(((6 - blockers.length) / 6) * 100),
  };
}

export function orbitHandoff(workspace: Workspace, deal: Deal) {
  const { business, products, blockers, ready } = orbitReadiness(
    workspace,
    deal,
  );
  const lines = products.map(
    (product) =>
      `- ${product.name}: ${moneyLabel(product.price, business?.currency)}; stock ${product.stock}; ${product.description || "description pending"}`,
  );
  return `ORBIT DELIVERY HANDOFF — ${deal.name}

STATUS
${ready ? "Ready for controlled production" : `Blocked: ${blockers.join("; ")}`}

COMMERCIAL CONTEXT
Offer: ${workspace.settings.offerName || "Direct Commerce Launch"}
Agreed opportunity value: ${moneyLabel(deal.value, workspace.settings.currency)}
Client contact: ${deal.contact || "Not recorded"}
Linked business: ${business?.name || "Not linked"}
Approved scope notes: ${deal.notes || "Not recorded"}

BUSINESS FACTS
${business ? `${business.name} · ${business.category}\n${business.description}\nWhatsApp: +${business.phone}` : "Business details pending"}

PRODUCT FACTS
${lines.length ? lines.join("\n") : "No products recorded"}

ORBIT PRODUCTION GATES
1. Use only the approved facts above; do not invent claims, prices or availability.
2. Produce the catalog and launch assets for human review.
3. Verify mobile layout, links, WhatsApp destination and current inventory.
4. Obtain explicit owner approval before publication or delivery.
5. Keep the verified deposit or payment reference linked to this opportunity.

Nothing in this handoff publishes, messages a customer or charges a payment automatically.`;
}
export function escapeHTML(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function scriptFor(b: Business, p: Product, language: string) {
  return language === "es"
    ? `¿Buscas ${p.name.toLowerCase()}? En ${b.name} puedes pedir directamente. ${p.description || b.description} Precio: ${moneyLabel(p.price, b.currency)}. Escríbenos por WhatsApp para confirmar disponibilidad y coordinar entrega o recogida. ${b.name}: tu próximo pedido empieza aquí.`
    : `Looking for ${p.name.toLowerCase()}? Order directly from ${b.name}. ${p.description || b.description} Priced at ${moneyLabel(p.price, b.currency)}. Message us on WhatsApp to confirm availability and arrange pickup or delivery. ${b.name}: your next order starts here.`;
}
export function catalogHTML(b: Business, products: Product[]) {
  const safe = (s: string) => escapeHTML(s);
  const available = products.filter((product) => product.stock > 0);
  const publicProducts = available.map(({ id, name, price, stock }) => ({
    id,
    name,
    price,
    stock,
  }));
  const productData = JSON.stringify(publicProducts).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Order directly from ${safe(b.name)}">
  <title>${safe(b.name)} · Direct orders</title>
  <style>
    :root{--paper:#f5f3eb;--ink:#173b35;--muted:#66776f;--line:#dde2da;--accent:#d8e89e}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,-apple-system,sans-serif}
    header,main,footer{max-width:1120px;margin:auto;padding:48px 24px}header{padding-bottom:28px}.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:700;color:#718064}
    h1{font:clamp(42px,8vw,82px)/.95 Georgia,serif;letter-spacing:-.04em;margin:22px 0}header p{max-width:650px;color:var(--muted)}
    main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;padding-top:10px;padding-bottom:180px}
    article{background:white;border:1px solid var(--line);padding:18px;border-radius:18px;display:flex;flex-direction:column;min-height:320px}
    img,.placeholder{width:100%;height:180px;object-fit:cover;border-radius:12px;background:#e8ecdf}.placeholder{display:grid;place-items:center;font:34px Georgia;color:#839471}
    h2{font:25px Georgia,serif;margin:20px 0 8px}article p{color:var(--muted);font-size:14px;flex:1}h3{font:26px Georgia;margin:12px 0}
    button{border:0;border-radius:9px;padding:13px 16px;font:700 13px system-ui;cursor:pointer}.add{background:var(--ink);color:white}.add:disabled{background:#dfe3dc;color:#8c968e;cursor:not-allowed}
    .sold{font-size:12px;color:#8d514a;font-weight:700}.cart{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:min(920px,calc(100% - 28px));background:#173b35;color:white;border-radius:18px;padding:18px 20px;box-shadow:0 20px 60px #173b3540;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
    .cart strong{font:23px Georgia}.cart small{display:block;color:#c5d0c9;margin-top:4px}.cart button{background:var(--accent);color:var(--ink);min-width:190px}.cart button:disabled{opacity:.45;cursor:not-allowed}
    footer{color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-bottom:130px}@media(max-width:620px){header{padding-top:30px}.cart{grid-template-columns:1fr}.cart button{width:100%}main{padding-bottom:230px}}
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">DIRECT FROM THE BUSINESS</div>
    <h1>${safe(b.name)}</h1>
    <p>${safe(b.description)}</p>
    <p>${safe(b.category)} · Prices in ${b.currency}</p>
  </header>
  <main>
    ${products
      .map(
        (p) => `<article>
      ${p.image ? `<img src="${safe(p.image)}" alt="${safe(p.name)}" loading="lazy">` : `<div class="placeholder" aria-hidden="true">${safe(p.name.slice(0, 1).toUpperCase())}</div>`}
      <h2>${safe(p.name)}</h2>
      <p>${safe(p.description)}</p>
      <h3>${moneyLabel(p.price, b.currency)}</h3>
      ${p.stock > 0 ? `<button class="add" data-product="${safe(p.id)}">Add to request</button>` : `<span class="sold">Currently unavailable</span>`}
    </article>`,
      )
      .join("")}
  </main>
  <footer>Prices exclude delivery unless confirmed by the business. Sending the request does not create a paid or confirmed order. No payment details are collected here.</footer>
  <aside class="cart" aria-live="polite">
    <div><strong id="cart-total">${moneyLabel(0, b.currency)}</strong><small id="cart-summary">Your request is empty</small></div>
    <button id="send" disabled>Request on WhatsApp ↗</button>
  </aside>
  <script type="application/json" id="catalog-data">${productData}</script>
  <script>
    (() => {
      const products = JSON.parse(document.getElementById('catalog-data').textContent);
      const quantities = new Map();
      const currency = ${JSON.stringify(b.currency)};
      const business = ${JSON.stringify(b.name).replace(/</g, "\\u003c")};
      const phone = ${JSON.stringify(b.phone)};
      const money = new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {style:'currency',currency,maximumFractionDigits:currency === 'COP' ? 0 : 2});
      const total = document.getElementById('cart-total');
      const summary = document.getElementById('cart-summary');
      const send = document.getElementById('send');
      function render(){
        const selected = products.filter(product => (quantities.get(product.id) || 0) > 0);
        const count = selected.reduce((sum,product) => sum + quantities.get(product.id), 0);
        const amount = selected.reduce((sum,product) => sum + product.price * quantities.get(product.id), 0);
        total.textContent = money.format(amount);
        summary.textContent = count ? count + (count === 1 ? ' item in request' : ' items in request') : 'Your request is empty';
        send.disabled = count === 0;
        document.querySelectorAll('[data-product]').forEach(button => {
          const quantity = quantities.get(button.dataset.product) || 0;
          button.textContent = quantity ? 'Add another · ' + quantity + ' selected' : 'Add to request';
        });
      }
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-product]');
        if (!button) return;
        const product = products.find(item => item.id === button.dataset.product);
        const next = Math.min((quantities.get(product.id) || 0) + 1, product.stock);
        quantities.set(product.id, next);
        render();
      });
      send.addEventListener('click', () => {
        const lines = products.filter(product => quantities.get(product.id)).map(product => {
          const quantity = quantities.get(product.id);
          return '• ' + quantity + ' × ' + product.name + ' — ' + money.format(product.price * quantity);
        });
        const amount = products.reduce((sum,product) => sum + product.price * (quantities.get(product.id) || 0), 0);
        const message = ['Hello ' + business + ', I would like to request:', '', ...lines, '', 'Catalog subtotal: ' + money.format(amount), 'Please confirm availability, pickup or delivery, and the final total.'].join('\\n');
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
      });
      render();
    })();
  </script>
</body>
</html>`;
}

export function proposalHTML(
  b: Business | null,
  deal: Deal,
  settings: Workspace["settings"],
) {
  const safe = (value: string) => escapeHTML(value);
  const today = new Date().toISOString().slice(0, 10);
  const price = moneyLabel(
    deal.value || settings.setupPrice,
    settings.currency,
  );
  const seller = settings.sellerName || b?.name || "ORBIT";
  const offer = settings.offerName || "Direct Commerce Launch";
  const promise =
    settings.offerPromise ||
    "A clear direct-order catalog, launch content and an owner handoff.";
  const percent = settings.depositPercent ?? 50;
  const deposit = moneyLabel(
    ((deal.value || settings.setupPrice) * percent) / 100,
    settings.currency,
  );
  const phone = settings.sellerPhone || "";
  const paymentLink = /^https:\/\//.test(settings.paymentLink || "")
    ? settings.paymentLink || ""
    : "";
  const message = encodeURIComponent(
    `Hello ${seller}, I would like to discuss the ${offer} proposal for ${deal.name}.`,
  );
  const contact = [
    phone
      ? `<a class="cta" href="https://wa.me/${safe(phone)}?text=${message}">Discuss on WhatsApp</a>`
      : "",
    paymentLink
      ? `<a class="cta secondary" href="${safe(paymentLink)}" target="_blank" rel="noopener noreferrer">Open secure deposit link</a>`
      : "",
    settings.sellerEmail
      ? `<a class="cta secondary" href="mailto:${safe(settings.sellerEmail)}?subject=${encodeURIComponent(`${offer} proposal`)}">Reply by email</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposal · ${safe(deal.name)}</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f2ea;color:#173b35;font:15px/1.65 system-ui}main{max-width:900px;margin:40px auto;background:white;padding:clamp(30px,7vw,80px);box-shadow:0 20px 70px #173b3514}.label{font-size:10px;letter-spacing:.18em;font-weight:700;color:#7d8e6c}h1{font:clamp(42px,7vw,72px)/1 Georgia;margin:30px 0}h2{font:28px Georgia;margin-top:48px}.intro{font-size:19px;color:#63736b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:40px 0}.box{background:#edf1e4;padding:24px;border-radius:12px}.price{font:42px Georgia;margin:0}.scope li{margin:12px 0}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:38px 0}.cta{display:inline-block;background:#173b35;color:white;text-decoration:none;padding:14px 18px;border-radius:9px;font-weight:700}.cta.secondary{background:#d8e89e;color:#173b35}.terms{border-top:1px solid #dce2d9;margin-top:50px;padding-top:25px;color:#6e7a74;font-size:12px}@media(max-width:620px){.grid{grid-template-columns:1fr}}@media print{body{background:white}main{margin:0;box-shadow:none}.actions{display:none}}</style></head><body><main><div class="label">DRAFT SERVICE PROPOSAL · ${today}</div><h1>${safe(offer)}</h1><p class="intro">Prepared for <strong>${safe(deal.name)}</strong>${deal.contact ? ` · ${safe(deal.contact)}` : ""} by ${safe(seller)}.</p><p class="intro">${safe(promise)}</p><div class="grid"><div class="box"><div class="label">PROPOSED INVESTMENT</div><p class="price">${price}</p><p>Proposed deposit: ${deposit} (${percent}%). Subject to written approval.</p></div><div class="box"><div class="label">NEXT STEP</div><p>${safe(deal.nextAction || "Confirm scope, timeline and payment terms")}</p>${deal.due ? `<p>Target follow-up: ${safe(deal.due)}</p>` : ""}</div></div>${contact ? `<div class="actions">${contact}</div>` : ""}<h2>Proposed scope</h2><ul class="scope"><li>One direct-order catalog using approved business and product information.</li><li>Up to ten products with current prices and availability.</li><li>A WhatsApp request flow tested with the business owner.</li><li>Three editable launch scripts and one recorded voiceover file.</li><li>One handoff session and one revision round.</li></ul><h2>Success criteria</h2><p>The catalog opens correctly on mobile and desktop, sends a complete order request to the approved business number, and can be updated from the delivered workspace.</p><div class="terms">Draft generated from ORBIT. This document is not an invoice or binding agreement. Opening a payment link does not confirm payment. Final scope, delivery date, taxes, payment method, ownership and revision limits must be confirmed in writing before work begins.</div></main></body></html>`;
}
