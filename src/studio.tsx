import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Atom,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  FileCheck2,
  FlaskConical,
  Gauge,
  LockKeyhole,
  LogOut,
  Orbit,
  Play,
  Plus,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Upload,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type AgentEvent,
  type BacktestResult,
  type Strategy,
  type TradingWorkspace,
  type Workspace,
  emptyTradingWorkspace,
  emptyWorkspace,
  moneyLabel,
  paperMetrics,
  parseCandleCSV,
  runSMABacktest,
  strategyRisk,
  tradingState,
  workspaceSchema,
} from "../lib/domain";

const nav = [
  ["command", "Command center", Orbit],
  ["strategies", "Strategies", BrainCircuit],
  ["backtests", "Backtesting", BarChart3],
  ["agents", "Agent network", Bot],
  ["risk", "Risk control", ShieldCheck],
  ["ledger", "Paper ledger", WalletCards],
  ["plans", "Plans", CircleDollarSign],
] as const;
type View = (typeof nav)[number][0];
const agents: ReadonlyArray<{
  id: AgentEvent["agent"];
  name: string;
  purpose: string;
  icon: LucideIcon;
}> = [
  { id: "scout", name: "SCOUT", purpose: "Market observation", icon: Radar },
  {
    id: "strategist",
    name: "STRATEGIST",
    purpose: "Thesis & scenarios",
    icon: BrainCircuit,
  },
  { id: "risk", name: "RISK", purpose: "Exposure limits", icon: Gauge },
  {
    id: "compliance",
    name: "COMPLIANCE",
    purpose: "Policy gates",
    icon: FileCheck2,
  },
  { id: "executor", name: "EXECUTOR", purpose: "Paper orders", icon: Play },
  { id: "auditor", name: "AUDITOR", purpose: "Evidence trail", icon: Eye },
];
const timestamp = () => new Date().toISOString();
function agentEvent(
  agent: AgentEvent["agent"],
  status: AgentEvent["status"],
  message: string,
): AgentEvent {
  return {
    id: crypto.randomUUID(),
    agent,
    status,
    message,
    timestamp: timestamp(),
  };
}
function demoWorkspace(): Workspace {
  const workspace = emptyWorkspace();
  const strategy: Strategy = {
    id: "demo-btc",
    name: "Momentum confirmation",
    symbol: "BTC/USDC",
    timeframe: "4h",
    thesis:
      "Modeled breakout scenario requiring trend confirmation before a paper entry. No live market feed is connected.",
    status: "approved",
    confidence: 74,
    entry: 67000,
    stopLoss: 64320,
    takeProfit: 72360,
    riskPercent: 1,
    createdAt: timestamp(),
  };
  workspace.trading = {
    ...emptyTradingWorkspace(),
    strategies: [strategy],
    events: [
      agentEvent("auditor", "observed", "Demo environment initialized."),
      agentEvent(
        "compliance",
        "approved",
        "Paper-only execution gate verified.",
      ),
      agentEvent(
        "risk",
        "approved",
        "Position risk is within the strategy limit.",
      ),
      agentEvent(
        "strategist",
        "proposed",
        "Momentum confirmation scenario prepared.",
      ),
    ],
  };
  return workspace;
}
function downloadContent(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadJSON(value: unknown, name: string) {
  downloadContent(JSON.stringify(value, null, 2), name, "application/json");
}
function downloadSampleCandles() {
  const rows = Array.from({ length: 180 }, (_, index) => {
    const open = 100 + Math.sin((index - 1) / 7) * 9 + index * 0.04;
    const close = 100 + Math.sin(index / 7) * 9 + index * 0.04;
    const time = new Date(Date.UTC(2026, 0, 1, index)).toISOString();
    return [
      time,
      open.toFixed(2),
      (Math.max(open, close) + 1).toFixed(2),
      (Math.min(open, close) - 1).toFixed(2),
      close.toFixed(2),
      1000 + index * 3,
    ].join(",");
  });
  downloadContent(
    ["timestamp,open,high,low,close,volume", ...rows].join("\n"),
    "orbit-sample-candles.csv",
    "text/csv",
  );
}

export default function Studio({
  displayName,
  csrf,
  onLogout,
}: {
  displayName: string;
  csrf: string;
  onLogout: () => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<View>("command");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [composer, setComposer] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [latestBacktestId, setLatestBacktestId] = useState("");
  const trading = tradingState(workspace);
  const metrics = paperMetrics(trading);
  const selected =
    trading.strategies.find((item) => item.id === selectedId) ||
    trading.strategies[0];
  const latestBacktest =
    trading.backtests.find((item) => item.id === latestBacktestId) ||
    trading.backtests[0];

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/workspace");
      const data = (await response.json()) as {
        error?: string;
        workspace: Workspace;
        revision: number;
      };
      if (response.status === 401)
        window.dispatchEvent(new Event("session-expired"));
      if (!response.ok) throw Error(data.error || "Unable to open ORBIT");
      setWorkspace(workspaceSchema.parse(data.workspace));
      setRevision(data.revision);
      setLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open ORBIT");
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function persist(nextTrading: TradingWorkspace, message: string) {
    const next = structuredClone(workspace);
    next.trading = nextTrading;
    const parsed = workspaceSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join("; "));
      return false;
    }
    if (demo) {
      setWorkspace(parsed.data);
      setToast(`${message} · demo only`);
      return true;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ workspace: parsed.data, revision }),
      });
      const data = (await response.json()) as {
        error?: string;
        workspace: Workspace;
        revision: number;
      };
      if (response.status === 401)
        window.dispatchEvent(new Event("session-expired"));
      if (!response.ok) throw Error(data.error || "Unable to save");
      setWorkspace(workspaceSchema.parse(data.workspace));
      setRevision(data.revision);
      setToast(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createStrategy(form: HTMLFormElement) {
    const data = new FormData(form),
      value = (key: string) => String(data.get(key) || "").trim();
    const strategy: Strategy = {
      id: crypto.randomUUID(),
      name: value("name"),
      symbol: value("symbol").toUpperCase(),
      timeframe: value("timeframe") as Strategy["timeframe"],
      thesis: value("thesis"),
      status: "review",
      confidence: Number(value("confidence")),
      entry: Number(value("entry")),
      stopLoss: Number(value("stopLoss")),
      takeProfit: Number(value("takeProfit")),
      riskPercent: Number(value("riskPercent")),
      createdAt: timestamp(),
    };
    const next: TradingWorkspace = {
      ...trading,
      strategies: [strategy, ...trading.strategies],
      events: [
        agentEvent(
          "strategist",
          "proposed",
          `${strategy.name} submitted for independent risk review.`,
        ),
        ...trading.events,
      ],
    };
    if (await persist(next, "Strategy submitted for review")) {
      setSelectedId(strategy.id);
      setComposer(false);
      setView("strategies");
    }
  }
  async function reviewStrategy(strategy: Strategy) {
    const sizing = strategyRisk(
      strategy,
      metrics.equity,
      trading.maxPositionPercent,
    );
    const blockers = [
      strategy.confidence < 60 ? "confidence below 60%" : "",
      strategy.riskPercent > trading.maxDailyLossPercent
        ? "risk exceeds daily loss limit"
        : "",
      sizing.rewardToRisk < 1.5 ? "reward-to-risk below 1.5" : "",
    ].filter(Boolean);
    const approved = blockers.length === 0;
    await persist(
      {
        ...trading,
        strategies: trading.strategies.map((item) =>
          item.id === strategy.id
            ? { ...item, status: approved ? "approved" : "paused" }
            : item,
        ),
        events: [
          agentEvent(
            "compliance",
            approved ? "approved" : "blocked",
            approved
              ? `${strategy.name} passed paper-execution policy.`
              : `${strategy.name} blocked: ${blockers.join(", ")}.`,
          ),
          agentEvent(
            "risk",
            approved ? "approved" : "blocked",
            `Modeled risk ${moneyLabel(sizing.riskAmount)} · R:R ${sizing.rewardToRisk.toFixed(2)}.`,
          ),
          ...trading.events,
        ],
      },
      approved ? "Strategy approved for paper mode" : "Strategy blocked",
    );
  }
  async function runScenario(strategy: Strategy) {
    if (strategy.status !== "approved") {
      setError("Only an approved strategy can enter the paper ledger.");
      return;
    }
    const sizing = strategyRisk(
      strategy,
      metrics.equity,
      trading.maxPositionPercent,
    );
    if (
      sizing.riskAmount >
      (metrics.equity * trading.maxDailyLossPercent) / 100
    ) {
      await persist(
        {
          ...trading,
          events: [
            agentEvent(
              "risk",
              "blocked",
              `${strategy.name} exceeded the loss budget.`,
            ),
            ...trading.events,
          ],
        },
        "Scenario blocked by risk control",
      );
      return;
    }
    const mark =
      strategy.confidence >= 70 ? strategy.takeProfit : strategy.stopLoss;
    const pnl = (mark - strategy.entry) * sizing.quantity;
    await persist(
      {
        ...trading,
        paperTrades: [
          {
            id: crypto.randomUUID(),
            strategyId: strategy.id,
            symbol: strategy.symbol,
            side: "long",
            status: "closed",
            entry: strategy.entry,
            mark,
            quantity: sizing.quantity,
            riskAmount: sizing.riskAmount,
            pnl,
            openedAt: timestamp(),
            closedAt: timestamp(),
          },
          ...trading.paperTrades,
        ],
        events: [
          agentEvent(
            "auditor",
            "observed",
            `Scenario result recorded with ${moneyLabel(pnl)} modeled P&L.`,
          ),
          agentEvent(
            "executor",
            "simulated",
            `${strategy.symbol} paper scenario completed. No order was sent.`,
          ),
          ...trading.events,
        ],
      },
      "Modeled scenario added to paper ledger",
    );
  }
  async function updateLimits(form: HTMLFormElement) {
    const data = new FormData(form);
    await persist(
      {
        ...trading,
        startingBalance: Number(data.get("startingBalance")),
        maxDailyLossPercent: Number(data.get("maxDailyLossPercent")),
        maxPositionPercent: Number(data.get("maxPositionPercent")),
        events: [
          agentEvent(
            "auditor",
            "observed",
            "Risk policy was updated by the owner.",
          ),
          ...trading.events,
        ],
      },
      "Risk policy saved",
    );
  }

  async function runBacktest(form: HTMLFormElement) {
    setError("");
    const data = new FormData(form);
    const strategyId = String(data.get("strategyId") || "");
    const strategy = trading.strategies.find((item) => item.id === strategyId);
    const file = data.get("dataset");
    if (!strategy) {
      setError("Select a strategy before running a backtest.");
      return;
    }
    if (!(file instanceof File) || !file.size) {
      setError("Choose a CSV dataset first.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("CSV files are limited to 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const source = await file.text();
      const candles = parseCandleCSV(source);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(source),
      );
      const sourceHash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      const fastWindow = Number(data.get("fastWindow"));
      const slowWindow = Number(data.get("slowWindow"));
      const feeBps = Number(data.get("feeBps"));
      const result = runSMABacktest(candles, {
        startingBalance: trading.startingBalance,
        fastWindow,
        slowWindow,
        feeBps,
        positionPercent: trading.maxPositionPercent,
      });
      const record: BacktestResult = {
        id: crypto.randomUUID(),
        strategyId,
        symbol: strategy.symbol,
        sourceName: file.name,
        sourceHash,
        algorithm: "sma-crossover-v1",
        fastWindow,
        slowWindow,
        feeBps,
        positionPercent: trading.maxPositionPercent,
        bars: candles.length,
        from: candles[0].timestamp,
        to: candles.at(-1)!.timestamp,
        startingBalance: trading.startingBalance,
        ...result,
        testedAt: timestamp(),
      };
      const saved = await persist(
        {
          ...trading,
          backtests: [record, ...trading.backtests],
          events: [
            agentEvent(
              "auditor",
              "observed",
              `${strategy.name} backtest recorded from ${candles.length} historical candles.`,
            ),
            agentEvent(
              "strategist",
              "simulated",
              `SMA ${fastWindow}/${slowWindow} completed with ${record.netReturnPercent.toFixed(2)}% modeled historical return.`,
            ),
            ...trading.events,
          ],
        },
        "Historical backtest saved",
      );
      if (saved) {
        setLatestBacktestId(record.id);
        form.reset();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Backtest failed");
    } finally {
      setBusy(false);
    }
  }
  const agentStates = useMemo(
    () =>
      new Map(
        agents.map((agent) => [
          agent.id,
          trading.events.find((item) => item.agent === agent.id),
        ]),
      ),
    [trading.events],
  );

  return (
    <div className="orbit-shell">
      <aside className="orbit-sidebar">
        <button className="orbit-brand" onClick={() => setView("command")}>
          <span className="orbit-logo">
            <Atom size={24} />
          </span>
          <span>
            ORBIT<small>AGENTIC MARKET LAB</small>
          </span>
        </button>
        <p className="nav-kicker">OPERATIONS</p>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon size={17} />
              {label}
              {id === "command" && <i />}
            </button>
          ))}
        </nav>
        <div className="mode-lock">
          <LockKeyhole size={16} />
          <div>
            <strong>PAPER MODE</strong>
            <small>Live execution locked</small>
          </div>
        </div>
        <div className="orbit-user">
          <span>{displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{displayName.split("@")[0]}</strong>
            <small>Owner</small>
          </div>
          <button onClick={onLogout} aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className="orbit-main">
        <header className="orbit-header">
          <div>
            <span className="pulse" /> SYSTEM ONLINE <b>/</b>{" "}
            {nav.find(([id]) => id === view)?.[1]}
          </div>
          <div className="header-actions">
            <span>{busy ? "SAVING" : loaded ? "SYNCED" : "CONNECTING"}</span>
            <button
              onClick={() => {
                if (demo) {
                  setDemo(false);
                  load();
                } else {
                  setDemo(true);
                  setWorkspace(demoWorkspace());
                  setSelectedId("demo-btc");
                  setLoaded(true);
                }
              }}
            >
              {demo ? "Exit demo" : "Load demo"}
            </button>
          </div>
        </header>
        {demo && (
          <div className="system-banner">
            <FlaskConical size={15} /> Demo data · modeled outcomes · no live
            prices
          </div>
        )}
        {error && (
          <div className="error-banner">
            <TriangleAlert size={16} />
            {error}
            <button onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {toast && (
          <div className="toast">
            <Check size={15} />
            {toast}
          </div>
        )}
        {!loaded ? (
          <div className="loading-screen">
            <RefreshCw className="spin" />
            Initializing agent network…
          </div>
        ) : (
          <div className="orbit-content">
            {view === "command" && (
              <>
                <section className="command-hero">
                  <div>
                    <p className="signal-label">ORBIT / CONTROL PLANE</p>
                    <h1>
                      Autonomous insight.
                      <br />
                      <em>Human authority.</em>
                    </h1>
                    <p>
                      Coordinate research, strategy, risk and simulation from
                      one auditable command center.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="neon-button"
                        onClick={() => setComposer(true)}
                      >
                        <Plus size={17} />
                        New strategy
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => setView("agents")}
                      >
                        Inspect network
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="orbital-core"
                    aria-label="Six agents connected to ORBIT core"
                  >
                    <div className="ring ring-one" />
                    <div className="ring ring-two" />
                    <div className="core">
                      <Atom size={35} />
                      <span>ORBIT</span>
                      <small>PAPER</small>
                    </div>
                    {agents.map((agent, index) => {
                      const Icon = agent.icon;
                      return (
                        <span
                          className={`satellite s${index + 1}`}
                          key={agent.id}
                          title={agent.name}
                        >
                          <Icon size={16} />
                        </span>
                      );
                    })}
                  </div>
                </section>
                <section className="metric-strip">
                  <Metric
                    label="Paper equity"
                    value={moneyLabel(metrics.equity)}
                    note="Modeled, not a brokerage balance"
                  />
                  <Metric
                    label="Realized P&L"
                    value={moneyLabel(metrics.realizedPnl)}
                    note={`${metrics.closedTrades} closed scenarios`}
                    tone={metrics.realizedPnl >= 0 ? "positive" : "negative"}
                  />
                  <Metric
                    label="Open risk"
                    value={moneyLabel(metrics.openRisk)}
                    note={`Limit ${trading.maxDailyLossPercent}% per day`}
                  />
                  <Metric
                    label="Approved systems"
                    value={String(
                      trading.strategies.filter(
                        (item) => item.status === "approved",
                      ).length,
                    )}
                    note={`${trading.strategies.length} total strategies`}
                  />
                </section>
                <div className="dashboard-grid">
                  <section className="glass-panel strategy-focus">
                    <div className="panel-head">
                      <div>
                        <p className="signal-label">ACTIVE STRATEGY</p>
                        <h2>{selected?.name || "No strategy yet"}</h2>
                      </div>
                      {selected && (
                        <span className={`status-chip ${selected.status}`}>
                          {selected.status}
                        </span>
                      )}
                    </div>
                    {selected ? (
                      <>
                        <div className="symbol-line">
                          <strong>{selected.symbol}</strong>
                          <span>{selected.timeframe}</span>
                          <span>{selected.confidence}% confidence</span>
                        </div>
                        <p>{selected.thesis}</p>
                        <div className="price-path">
                          <span>
                            <small>STOP</small>
                            {moneyLabel(selected.stopLoss)}
                          </span>
                          <i />
                          <span>
                            <small>ENTRY</small>
                            {moneyLabel(selected.entry)}
                          </span>
                          <i />
                          <span>
                            <small>TARGET</small>
                            {moneyLabel(selected.takeProfit)}
                          </span>
                        </div>
                        <button
                          className="neon-button full"
                          disabled={selected.status !== "approved" || busy}
                          onClick={() => runScenario(selected)}
                        >
                          <Play size={16} />
                          Run modeled scenario
                        </button>
                      </>
                    ) : (
                      <button
                        className="empty-action"
                        onClick={() => setComposer(true)}
                      >
                        <Plus />
                        Create your first strategy
                      </button>
                    )}
                  </section>
                  <section className="glass-panel event-feed">
                    <div className="panel-head">
                      <div>
                        <p className="signal-label">LIVE AUDIT TRAIL</p>
                        <h2>Agent activity</h2>
                      </div>
                      <Activity size={18} />
                    </div>
                    <div className="event-list">
                      {trading.events.slice(0, 6).map((item) => (
                        <article key={item.id}>
                          <span className={`event-dot ${item.status}`} />
                          <div>
                            <strong>{item.agent}</strong>
                            <p>{item.message}</p>
                            <small>
                              {new Date(item.timestamp).toLocaleString()}
                            </small>
                          </div>
                        </article>
                      ))}
                      {!trading.events.length && (
                        <p className="muted">
                          Activity will appear after you create a strategy.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
            {view === "strategies" && (
              <>
                <PageTitle
                  kicker="RESEARCH → REVIEW → SIMULATION"
                  title="Strategy lab"
                  detail="Every hypothesis must pass independent risk and policy gates before it can reach the paper ledger."
                  action={() => setComposer(true)}
                />
                <div className="strategy-grid">
                  {trading.strategies.map((strategy) => {
                    const sizing = strategyRisk(
                      strategy,
                      metrics.equity,
                      trading.maxPositionPercent,
                    );
                    return (
                      <article
                        className={`strategy-card ${selected?.id === strategy.id ? "selected" : ""}`}
                        key={strategy.id}
                        onClick={() => setSelectedId(strategy.id)}
                      >
                        <div className="panel-head">
                          <span className={`status-chip ${strategy.status}`}>
                            {strategy.status}
                          </span>
                          <strong>{strategy.symbol}</strong>
                        </div>
                        <h2>{strategy.name}</h2>
                        <p>{strategy.thesis}</p>
                        <dl>
                          <div>
                            <dt>Confidence</dt>
                            <dd>{strategy.confidence}%</dd>
                          </div>
                          <div>
                            <dt>R:R</dt>
                            <dd>{sizing.rewardToRisk.toFixed(2)}</dd>
                          </div>
                          <div>
                            <dt>Risk</dt>
                            <dd>{moneyLabel(sizing.riskAmount)}</dd>
                          </div>
                        </dl>
                        <div className="card-actions">
                          {strategy.status === "review" && (
                            <button
                              className="ghost-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                reviewStrategy(strategy);
                              }}
                            >
                              <ShieldCheck size={15} />
                              Run gates
                            </button>
                          )}
                          <button
                            className="neon-button"
                            disabled={strategy.status !== "approved"}
                            onClick={(e) => {
                              e.stopPropagation();
                              runScenario(strategy);
                            }}
                          >
                            <Play size={15} />
                            Simulate
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!trading.strategies.length && (
                    <div className="blank-state">
                      <BrainCircuit size={40} />
                      <h2>No strategies yet</h2>
                      <p>
                        Start with a falsifiable thesis, explicit invalidation
                        and a bounded risk budget.
                      </p>
                      <button
                        className="neon-button"
                        onClick={() => setComposer(true)}
                      >
                        <Plus size={16} />
                        New strategy
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {view === "backtests" && (
              <>
                <PageTitle
                  kicker="HISTORICAL EVIDENCE, NOT PROMISES"
                  title="Backtesting lab"
                  detail="Test a transparent moving-average system against your own chronological OHLCV data. ORBIT stores the result summary, never the raw dataset."
                />
                <div className="backtest-layout">
                  <form
                    className="glass-panel backtest-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      runBacktest(event.currentTarget);
                    }}
                  >
                    <p className="signal-label">SMA CROSSOVER / V1</p>
                    <h2>Run a reproducible test</h2>
                    <label>
                      Strategy context
                      <select
                        name="strategyId"
                        defaultValue={selected?.id || ""}
                        required
                      >
                        <option value="" disabled>
                          Select a strategy
                        </option>
                        {trading.strategies.map((strategy) => (
                          <option key={strategy.id} value={strategy.id}>
                            {strategy.name} · {strategy.symbol}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="dataset-picker">
                      <Upload size={20} />
                      <span>
                        Historical candles
                        <small>
                          CSV · timestamp, open, high, low, close, volume
                        </small>
                      </span>
                      <input
                        name="dataset"
                        type="file"
                        accept=".csv,text/csv"
                        required
                      />
                    </label>
                    <div className="backtest-fields">
                      <label>
                        Fast SMA
                        <input
                          name="fastWindow"
                          type="number"
                          min="2"
                          max="500"
                          defaultValue="20"
                          required
                        />
                      </label>
                      <label>
                        Slow SMA
                        <input
                          name="slowWindow"
                          type="number"
                          min="3"
                          max="1000"
                          defaultValue="50"
                          required
                        />
                      </label>
                      <label>
                        Fee (bps/side)
                        <input
                          name="feeBps"
                          type="number"
                          min="0"
                          max="500"
                          defaultValue="10"
                          required
                        />
                      </label>
                    </div>
                    <button
                      className="ghost-button full sample-download"
                      type="button"
                      onClick={downloadSampleCandles}
                    >
                      <Download size={15} />
                      Download synthetic sample CSV
                    </button>
                    <button
                      className="neon-button full"
                      disabled={busy || !trading.strategies.length}
                    >
                      <BarChart3 size={16} />
                      {busy ? "Calculating…" : "Run historical test"}
                    </button>
                    <p className="backtest-disclosure">
                      Signals use closing data and execute at the next candle's
                      open. Fees apply on entry and exit. No slippage, spread,
                      liquidity or taxes are modeled.
                    </p>
                  </form>
                  <section className="glass-panel backtest-result">
                    <p className="signal-label">LATEST VERIFIED RUN</p>
                    {latestBacktest ? (
                      <>
                        <div className="result-title">
                          <div>
                            <h2>{latestBacktest.symbol}</h2>
                            <span>{latestBacktest.sourceName}</span>
                          </div>
                          <strong
                            className={
                              latestBacktest.netReturnPercent >= 0
                                ? "positive"
                                : "negative"
                            }
                          >
                            {latestBacktest.netReturnPercent >= 0 ? "+" : ""}
                            {latestBacktest.netReturnPercent.toFixed(2)}%
                          </strong>
                        </div>
                        <div className="result-metrics">
                          <ResultMetric
                            label="Ending balance"
                            value={moneyLabel(latestBacktest.endingBalance)}
                          />
                          <ResultMetric
                            label="Max drawdown"
                            value={`${latestBacktest.maxDrawdownPercent.toFixed(2)}%`}
                          />
                          <ResultMetric
                            label="Win rate"
                            value={`${latestBacktest.winRate.toFixed(1)}%`}
                          />
                          <ResultMetric
                            label="Trades"
                            value={String(latestBacktest.trades)}
                          />
                          <ResultMetric
                            label="Profit factor"
                            value={latestBacktest.profitFactor.toFixed(2)}
                          />
                          <ResultMetric
                            label="Buy & hold"
                            value={`${latestBacktest.buyHoldReturnPercent.toFixed(2)}%`}
                          />
                        </div>
                        <div className="test-evidence">
                          <span>
                            {latestBacktest.bars.toLocaleString()} candles
                          </span>
                          <span>
                            SMA {latestBacktest.fastWindow}/
                            {latestBacktest.slowWindow}
                          </span>
                          <span>{latestBacktest.feeBps} bps/side</span>
                          <span title={latestBacktest.sourceHash}>
                            SHA-256 {latestBacktest.sourceHash.slice(0, 12)}…
                          </span>
                          <span>
                            {new Date(latestBacktest.from).toLocaleDateString()}{" "}
                            – {new Date(latestBacktest.to).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="blank-result">
                        <BarChart3 size={42} />
                        <h2>No historical evidence yet</h2>
                        <p>
                          Upload a chronological candle CSV to establish the
                          first reproducible baseline.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
                {trading.backtests.length > 0 && (
                  <section className="backtest-history">
                    <div className="panel-head">
                      <div>
                        <p className="signal-label">EXPERIMENT HISTORY</p>
                        <h2>Compare every run</h2>
                      </div>
                      <span>{trading.backtests.length} saved tests</span>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Market / data</th>
                            <th>Parameters</th>
                            <th>Net return</th>
                            <th>Buy & hold</th>
                            <th>Drawdown</th>
                            <th>Trades</th>
                            <th>Tested</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trading.backtests.map((result) => (
                            <tr
                              key={result.id}
                              onClick={() => setLatestBacktestId(result.id)}
                            >
                              <td>
                                <strong>{result.symbol}</strong>
                                <small>{result.sourceName}</small>
                              </td>
                              <td>
                                {result.fastWindow}/{result.slowWindow} ·{" "}
                                {result.feeBps} bps
                              </td>
                              <td
                                className={
                                  result.netReturnPercent >= 0
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {result.netReturnPercent.toFixed(2)}%
                              </td>
                              <td>{result.buyHoldReturnPercent.toFixed(2)}%</td>
                              <td>{result.maxDrawdownPercent.toFixed(2)}%</td>
                              <td>{result.trades}</td>
                              <td>
                                {new Date(result.testedAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}
            {view === "agents" && (
              <>
                <PageTitle
                  kicker="SPECIALIZED INTELLIGENCE"
                  title="Agent network"
                  detail="Six bounded roles. Each agent can recommend; only policy gates authorize a paper action."
                />
                <div className="agent-grid">
                  {agents.map((agent, index) => {
                    const Icon = agent.icon,
                      last = agentStates.get(agent.id);
                    return (
                      <article className="agent-card" key={agent.id}>
                        <span className="agent-number">0{index + 1}</span>
                        <div className="agent-icon">
                          <Icon />
                        </div>
                        <h2>{agent.name}</h2>
                        <p>{agent.purpose}</p>
                        <div className="agent-state">
                          <span
                            className={`event-dot ${last?.status || "idle"}`}
                          />
                          <div>
                            <small>LATEST STATE</small>
                            <strong>{last?.status || "idle"}</strong>
                          </div>
                        </div>
                        <p className="agent-message">
                          {last?.message || "Waiting for an auditable task."}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            {view === "risk" && (
              <>
                <PageTitle
                  kicker="CAPITAL PRESERVATION FIRST"
                  title="Risk control"
                  detail="Hard limits are applied before any modeled order enters the paper ledger."
                />
                <div className="risk-layout">
                  <form
                    className="glass-panel risk-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateLimits(e.currentTarget);
                    }}
                  >
                    <p className="signal-label">OWNER POLICY</p>
                    <h2>Portfolio limits</h2>
                    <label>
                      Starting paper balance
                      <input
                        name="startingBalance"
                        type="number"
                        min="100"
                        max="100000000"
                        step="100"
                        defaultValue={trading.startingBalance}
                        required
                      />
                    </label>
                    <label>
                      Maximum daily loss (%)
                      <input
                        name="maxDailyLossPercent"
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        defaultValue={trading.maxDailyLossPercent}
                        required
                      />
                    </label>
                    <label>
                      Maximum position size (%)
                      <input
                        name="maxPositionPercent"
                        type="number"
                        min="0.1"
                        max="25"
                        step="0.1"
                        defaultValue={trading.maxPositionPercent}
                        required
                      />
                    </label>
                    <button className="neon-button full" disabled={busy}>
                      Save policy
                    </button>
                  </form>
                  <section className="glass-panel risk-monitor">
                    <p className="signal-label">ACTIVE GUARDRAILS</p>
                    <h2>Execution firewall</h2>
                    <Guard
                      icon={LockKeyhole}
                      title="Live execution"
                      value="LOCKED"
                      detail="No exchange keys, wallets or live-order route."
                    />
                    <Guard
                      icon={Gauge}
                      title="Daily loss budget"
                      value={moneyLabel(
                        (metrics.equity * trading.maxDailyLossPercent) / 100,
                      )}
                      detail={`${trading.maxDailyLossPercent}% of current paper equity.`}
                    />
                    <Guard
                      icon={Target}
                      title="Position ceiling"
                      value={moneyLabel(
                        (metrics.equity * trading.maxPositionPercent) / 100,
                      )}
                      detail={`${trading.maxPositionPercent}% maximum modeled notional.`}
                    />
                    <Guard
                      icon={FileCheck2}
                      title="Approval chain"
                      value="REQUIRED"
                      detail="Risk and compliance must approve every strategy."
                    />
                  </section>
                </div>
              </>
            )}
            {view === "ledger" && (
              <>
                <PageTitle
                  kicker="MODELED PERFORMANCE"
                  title="Paper ledger"
                  detail="A transparent record of simulated scenarios. These are not real trades or investment returns."
                />
                <section className="glass-panel ledger-panel">
                  <div className="ledger-head">
                    <div>
                      <span>Realized P&amp;L</span>
                      <strong>{moneyLabel(metrics.realizedPnl)}</strong>
                    </div>
                    <div>
                      <span>Win rate</span>
                      <strong>{metrics.winRate.toFixed(0)}%</strong>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        downloadJSON(
                          {
                            exportedAt: timestamp(),
                            mode: "paper",
                            trades: trading.paperTrades,
                            events: trading.events,
                          },
                          "orbit-paper-audit.json",
                        )
                      }
                    >
                      <Download size={15} />
                      Export audit
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Market</th>
                          <th>Status</th>
                          <th>Entry</th>
                          <th>Modeled exit</th>
                          <th>Risk</th>
                          <th>P&amp;L</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trading.paperTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td>
                              <strong>{trade.symbol}</strong>
                              <small>LONG · PAPER</small>
                            </td>
                            <td>
                              <span className="status-chip approved">
                                {trade.status}
                              </span>
                            </td>
                            <td>{moneyLabel(trade.entry)}</td>
                            <td>{moneyLabel(trade.mark)}</td>
                            <td>{moneyLabel(trade.riskAmount)}</td>
                            <td
                              className={
                                trade.pnl >= 0 ? "positive" : "negative"
                              }
                            >
                              {moneyLabel(trade.pnl)}
                            </td>
                            <td>{new Date(trade.openedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                        {!trading.paperTrades.length && (
                          <tr>
                            <td colSpan={7} className="empty-cell">
                              No modeled scenarios yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
            {view === "plans" && (
              <>
                <PageTitle
                  kicker="REVENUE MODEL"
                  title="Built to become a business"
                  detail="Charge for intelligence, workflow and evidence—not custody, hype or guaranteed profits."
                />
                <div className="plan-grid">
                  <Plan
                    name="Observer"
                    price="$29"
                    items={[
                      "3 active strategies",
                      "Paper ledger",
                      "Weekly audit export",
                    ]}
                  />
                  <Plan
                    featured
                    name="Operator"
                    price="$99"
                    items={[
                      "Unlimited strategies",
                      "Full agent network",
                      "Risk policy controls",
                      "Priority alerts",
                    ]}
                  />
                  <Plan
                    name="Desk"
                    price="$299"
                    items={[
                      "5 team seats",
                      "Approval workflows",
                      "API & webhooks",
                      "Custom reporting",
                    ]}
                  />
                </div>
                <div className="commercial-note">
                  <Sparkles />
                  <div>
                    <strong>Best initial offer</strong>
                    <p>
                      Sell Operator as a 30-day decision-support lab. Validate
                      retention and willingness to pay before adding live
                      integrations.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      {composer && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setComposer(false)
          }
        >
          <form
            className="strategy-modal"
            onSubmit={(e) => {
              e.preventDefault();
              createStrategy(e.currentTarget);
            }}
          >
            <div className="panel-head">
              <div>
                <p className="signal-label">NEW HYPOTHESIS</p>
                <h2>Design a strategy</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setComposer(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <label>
                Strategy name
                <input
                  name="name"
                  placeholder="Momentum confirmation"
                  maxLength={180}
                  required
                />
              </label>
              <label>
                Market
                <input
                  name="symbol"
                  placeholder="BTC/USDC"
                  pattern="[A-Za-z0-9/_-]+"
                  required
                />
              </label>
              <label>
                Timeframe
                <select name="timeframe" defaultValue="4h">
                  <option>15m</option>
                  <option>1h</option>
                  <option>4h</option>
                  <option>1d</option>
                </select>
              </label>
              <label>
                Confidence (%)
                <input
                  name="confidence"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="65"
                  required
                />
              </label>
              <label>
                Entry
                <input
                  name="entry"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Stop loss
                <input
                  name="stopLoss"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Take profit
                <input
                  name="takeProfit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Risk per scenario (%)
                <input
                  name="riskPercent"
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  defaultValue="1"
                  required
                />
              </label>
              <label className="span-two">
                Thesis & invalidation
                <textarea
                  name="thesis"
                  placeholder="What must be true, and what would prove the hypothesis wrong?"
                  maxLength={1200}
                  required
                />
              </label>
            </div>
            <div className="modal-note">
              <ShieldCheck size={16} />
              Submission does not execute a trade. Risk and compliance review it
              first.
            </div>
            <button className="neon-button full" disabled={busy}>
              Submit for review
              <ChevronRight size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function PageTitle({
  kicker,
  title,
  detail,
  action,
}: {
  kicker: string;
  title: string;
  detail: string;
  action?: () => void;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="signal-label">{kicker}</p>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action && (
        <button className="neon-button" onClick={action}>
          <Plus size={16} />
          New strategy
        </button>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  note,
  tone = "",
}: {
  label: string;
  value: string;
  note: string;
  tone?: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Guard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="guard">
      <span>
        <Icon />
      </span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}
function Plan({
  name,
  price,
  items,
  featured = false,
}: {
  name: string;
  price: string;
  items: string[];
  featured?: boolean;
}) {
  return (
    <article className={`plan-card ${featured ? "featured" : ""}`}>
      {featured && <span className="best">BEST STARTING OFFER</span>}
      <p className="signal-label">ORBIT {name.toUpperCase()}</p>
      <h2>
        {price}
        <small>/month</small>
      </h2>
      <p>Decision infrastructure for disciplined operators.</p>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={15} />
            {item}
          </li>
        ))}
      </ul>
      <button className={featured ? "neon-button full" : "ghost-button full"}>
        Validate demand
      </button>
    </article>
  );
}
