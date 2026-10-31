import express from "express";
import type { Request, Response, NextFunction } from "express";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { emptyWorkspace, workspaceSchema } from "../lib/domain.ts";
import { digest, verifyPassword, validPasswordHash } from "./auth.ts";
import { runCycle } from "../lib/ecomoda-core.mjs";
import {
  createMission,
  startTask,
  submitArtifact,
  reviewTask,
  missionSummary,
} from "../lib/business-factory.mjs";
import { jurisdictionByCode } from "../lib/us-policy.mjs";
import type { EcomodaFileStore } from "../lib/ecomoda-file-store.mjs";
import type { EcomodaInference } from "../lib/ecomoda-core.mjs";
import type { ProjectMemoryStore } from "../lib/ecomoda-project-memory.mjs";
import {
  billingPlans,
  type BillingGateway,
  type BillingPlan,
} from "./billing.ts";
export type Config = {
  databasePath: string;
  passwordHash: string;
  name?: string;
  production?: boolean;
  publicOrigin?: string;
  staticDir?: string;
  now?: () => number;
  ecomodaStore?: EcomodaFileStore;
  ecomodaInfer?: EcomodaInference;
  ecomodaTimeoutMs?: number;
  ecomodaMemory?: ProjectMemoryStore;
  billing?: BillingGateway;
};
export function createApplication(config: Config) {
  if (!validPasswordHash(config.passwordHash))
    throw Error("Set OWNER_PASSWORD_HASH using npm run password:hash");
  const now = config.now || Date.now;
  const ecomodaTimeoutMs = config.ecomodaTimeoutMs ?? 120000;
  if (
    !Number.isInteger(ecomodaTimeoutMs) ||
    ecomodaTimeoutMs < 10 ||
    ecomodaTimeoutMs > 300000
  )
    throw Error("ECOMODA timeout must be between 10 and 300000 milliseconds");
  if (config.production && !config.publicOrigin)
    throw Error("PUBLIC_ORIGIN is required in production");
  if (config.publicOrigin) {
    const u = new URL(config.publicOrigin);
    if (
      u.origin !== config.publicOrigin ||
      (config.production && u.protocol !== "https:")
    )
      throw Error("PUBLIC_ORIGIN must be an exact HTTPS origin in production");
  }
  if (config.databasePath !== ":memory:")
    mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
  const db = new DatabaseSync(config.databasePath);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  db.exec(
    "CREATE TABLE IF NOT EXISTS workspaces (owner_id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS billing_events (event_id TEXT PRIMARY KEY, received_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS billing_subscriptions (customer_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL);",
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS business_missions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)",
  );
  db.prepare(
    "INSERT OR IGNORE INTO workspaces(owner_id,payload,revision) VALUES(?,?,0)",
  ).run("owner", JSON.stringify(emptyWorkspace()));
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-DNS-Prefetch-Control": "off",
      "Referrer-Policy": "same-origin",
      "Permissions-Policy":
        "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Origin-Agent-Cluster": "?1",
    });
    if (config.production)
      res.set("Strict-Transport-Security", "max-age=31536000");
    res.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.get("origin");
      const expected =
        config.publicOrigin || `${req.protocol}://${req.get("host")}`;
      if (origin && origin !== expected)
        return res.status(403).json({ error: "Request origin is not allowed" });
      if (req.get("sec-fetch-site") === "cross-site")
        return res.status(403).json({ error: "Cross-site request rejected" });
    }
    next();
  });
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json", limit: "100kb" }),
    async (req, res) => {
      if (!config.billing)
        return res.status(503).json({ error: "Billing is not configured" });
      const signature = req.get("stripe-signature") || "";
      if (!signature)
        return res.status(400).json({ error: "Missing Stripe signature" });
      try {
        const update = await config.billing.parseWebhook(
          req.body as Buffer,
          signature,
        );
        if (!update) return res.json({ received: true });
        db.exec("BEGIN IMMEDIATE");
        try {
          const recorded = db
            .prepare(
              "INSERT OR IGNORE INTO billing_events(event_id,received_at) VALUES(?,?)",
            )
            .run(update.eventId, new Date(now()).toISOString());
          if (recorded.changes)
            db.prepare(
              "INSERT INTO billing_subscriptions(customer_id,subscription_id,email,plan,status,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET subscription_id=excluded.subscription_id,email=excluded.email,plan=excluded.plan,status=excluded.status,updated_at=excluded.updated_at",
            ).run(
              update.customerId,
              update.subscriptionId,
              update.email,
              update.plan,
              update.status,
              new Date(now()).toISOString(),
            );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        res.json({ received: true });
      } catch {
        res.status(400).json({ error: "Invalid Stripe webhook" });
      }
    },
  );
  app.use(express.json({ limit: "350kb", strict: true }));
  const cookieName = "sc_session";
  function token(req: Request) {
    return (
      req
        .get("cookie")
        ?.split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1) || ""
    );
  }
  function session(req: Request) {
    const t = token(req);
    if (!/^[a-f0-9]{64}$/.test(t)) return null;
    return db
      .prepare(
        "SELECT csrf,expires FROM sessions WHERE token_hash=? AND expires>?",
      )
      .get(digest(t), now()) as { csrf: string; expires: number } | undefined;
  }
  function cookie(value: string, age = 86400) {
    return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${config.production ? "; Secure" : ""}`;
  }
  function auth(req: Request, res: Response, next: NextFunction) {
    const s = session(req);
    if (!s)
      return res.status(401).json({ error: "Session expired. Sign in again." });
    if (
      ["PUT", "POST", "DELETE", "PATCH"].includes(req.method) &&
      req.get("X-CSRF-Token") !== s.csrf
    )
      return res.status(403).json({ error: "Invalid CSRF token" });
    next();
  }
  const attempts = new Map<string, { count: number; until: number }>();
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/billing/config", (_req, res) =>
    res.json({
      enabled: Boolean(config.billing),
      plans: Object.entries(billingPlans).map(([id, plan]) => ({
        id,
        ...plan,
      })),
    }),
  );
  const checkoutAttempts = new Map<string, { count: number; until: number }>();
  const checkoutRequest = z
    .object({ plan: z.enum(["observer", "operator", "desk"]) })
    .strict();
  app.post("/api/billing/checkout", async (req, res) => {
    if (!config.billing)
      return res.status(503).json({ error: "Paid beta is not configured" });
    const parsed = checkoutRequest.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid billing plan" });
    const ip = req.ip || "unknown";
    const current = checkoutAttempts.get(ip);
    const time = now();
    if (current && current.until > time && current.count >= 10)
      return res.status(429).json({ error: "Too many checkout attempts" });
    checkoutAttempts.set(ip, {
      count: current && current.until > time ? current.count + 1 : 1,
      until: current && current.until > time ? current.until : time + 3600000,
    });
    try {
      const origin =
        config.publicOrigin || `${req.protocol}://${req.get("host")}`;
      const checkout = await config.billing.createCheckout(
        parsed.data.plan as BillingPlan,
        origin,
      );
      res.status(201).json(checkout);
    } catch {
      res.status(502).json({ error: "Checkout is temporarily unavailable" });
    }
  });
  app.get("/api/session", (req, res) => {
    const s = session(req);
    if (!s) return res.status(401).json({ error: "Sign in required" });
    res.json({ name: config.name || "Juan", csrf: s.csrf });
  });
  app.post("/api/login", (req, res) => {
    const ip = req.ip || "unknown";
    const t = now();
    for (const [key, a] of attempts) if (a.until <= t) attempts.delete(key);
    const a = attempts.get(ip);
    if (a && a.count >= 5)
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again in 15 minutes." });
    if (!verifyPassword(req.body?.password, config.passwordHash)) {
      if (attempts.size >= 1000 && !attempts.has(ip))
        return res.status(429).json({ error: "Try again later." });
      attempts.set(ip, {
        count: (a?.count || 0) + 1,
        until: a?.until || t + 900000,
      });
      return res.status(401).json({ error: "Incorrect owner password" });
    }
    attempts.delete(ip);
    db.prepare("DELETE FROM sessions WHERE expires<=?").run(t);
    const tok = randomBytes(32).toString("hex"),
      csrf = randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO sessions(token_hash,csrf,expires) VALUES(?,?,?)",
    ).run(digest(tok), csrf, t + 86400000);
    db.prepare(
      "DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions ORDER BY expires DESC LIMIT -1 OFFSET 100)",
    ).run();
    res.set("Set-Cookie", cookie(tok));
    res.json({ name: config.name || "Juan", csrf });
  });
  app.post("/api/logout", auth, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      digest(token(req)),
    );
    res.set("Set-Cookie", cookie("", 0));
    res.json({ ok: true });
  });

  const missionCreateSchema = z
    .object({
      id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
      goal: z.string().trim().min(1).max(2000),
      customer: z.string().trim().min(1).max(2000),
      maxCostCents: z.number().int().min(0).max(1000000).default(0),
      maxMinutes: z.number().int().min(0).max(1000000).default(120),
      targetState: z
        .string()
        .refine((code) => Boolean(jurisdictionByCode(code)))
        .default("NY"),
      activity: z
        .enum([
          "general-commerce",
          "financial-education",
          "investment-advice",
          "children-directed",
        ])
        .default("general-commerce"),
      sellsOrSharesPersonalData: z.boolean().default(false),
      usesAutomatedDecisions: z.boolean().default(true),
    })
    .strict();
  const missionActionSchema = z
    .object({
      revision: z.number().int().nonnegative(),
      action: z.enum(["start", "submit", "review"]),
      taskId: z.enum([
        "research",
        "offer",
        "economics",
        "policy",
        "quality",
        "sales",
        "content",
      ]),
      artifact: z
        .object({
          kind: z.string().max(100),
          summary: z.string().min(1).max(2000),
          evidence: z.array(z.string().min(1).max(2000)).max(20).default([]),
          costCents: z.number().int().min(0).max(1000000).default(0),
          minutes: z.number().int().min(0).max(1000000).default(0),
        })
        .strict()
        .optional(),
      decision: z
        .object({ approved: z.boolean(), note: z.string().min(1).max(2000) })
        .strict()
        .optional(),
    })
    .strict();
  app.get("/api/business/missions", auth, (_req, res) => {
    const rows = db
      .prepare(
        "SELECT payload FROM business_missions ORDER BY updated_at DESC LIMIT 100",
      )
      .all() as { payload: string }[];
    res.json({
      missions: rows.map((row) => {
        const mission = JSON.parse(row.payload);
        return { ...mission, summary: missionSummary(mission) };
      }),
    });
  });
  app.post("/api/business/missions", auth, (req, res) => {
    const parsed = missionCreateSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid mission input" });
    const mission = createMission(parsed.data);
    const result = db
      .prepare(
        "INSERT OR IGNORE INTO business_missions(id,payload,revision,updated_at) VALUES(?,?,?,?)",
      )
      .run(
        mission.id,
        JSON.stringify(mission),
        mission.revision,
        new Date(now()).toISOString(),
      );
    if (!result.changes)
      return res.status(409).json({ error: "Mission already exists" });
    res.status(201).json({ mission });
  });
  app.post("/api/business/missions/:id/actions", auth, (req, res) => {
    const missionId = String(req.params.id);
    const parsed = missionActionSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid mission action" });
    const row = db
      .prepare("SELECT payload,revision FROM business_missions WHERE id=?")
      .get(missionId) as { payload: string; revision: number } | undefined;
    if (!row) return res.status(404).json({ error: "Mission not found" });
    if (row.revision !== parsed.data.revision)
      return res.status(409).json({ error: "Stale mission revision" });
    const { action, taskId, artifact, decision, revision } = parsed.data;
    let mission;
    try {
      const previous = JSON.parse(row.payload);
      if (action === "start") mission = startTask(previous, taskId, revision);
      else if (action === "submit" && artifact)
        mission = submitArtifact(previous, taskId, artifact, revision);
      else if (action === "review" && decision)
        mission = reviewTask(previous, taskId, decision, revision);
      else return res.status(400).json({ error: "Missing action payload" });
    } catch (e) {
      return res
        .status(400)
        .json({ error: e instanceof Error ? e.message : "Invalid transition" });
    }
    const changed = db
      .prepare(
        "UPDATE business_missions SET payload=?,revision=?,updated_at=? WHERE id=? AND revision=?",
      )
      .run(
        JSON.stringify(mission),
        mission.revision,
        new Date(now()).toISOString(),
        missionId,
        revision,
      );
    if (!changed.changes)
      return res.status(409).json({ error: "Concurrent mission update" });
    res.json({ mission, summary: missionSummary(mission) });
  });
  app.get("/api/workspace", auth, (_req, res) => {
    const row = db
      .prepare("SELECT payload,revision FROM workspaces WHERE owner_id=?")
      .get("owner") as { payload: string; revision: number };
    res.json({ workspace: JSON.parse(row.payload), revision: row.revision });
  });
  app.get("/api/billing/summary", auth, (_req, res) => {
    const subscriptions = db
      .prepare(
        "SELECT customer_id AS customerId,email,plan,status,updated_at AS updatedAt FROM billing_subscriptions ORDER BY updated_at DESC LIMIT 500",
      )
      .all() as Array<{
      customerId: string;
      email: string;
      plan: BillingPlan;
      status: string;
      updatedAt: string;
    }>;
    const active = subscriptions.filter((item) => item.status === "active");
    const mrr = active.reduce(
      (total, item) => total + (billingPlans[item.plan]?.monthlyUsd || 0),
      0,
    );
    res.json({
      configured: Boolean(config.billing),
      activeCustomers: active.length,
      mrr,
      annualRunRate: mrr * 12,
      subscriptions,
    });
  });
  const projectId = /^[a-z0-9][a-z0-9_-]{0,79}$/;
  app.get("/api/ecomoda/memory/:projectId", auth, async (req, res, next) => {
    if (!config.ecomodaMemory)
      return res
        .status(503)
        .json({ error: "Ecomoda project memory is not configured" });
    const id = req.params.projectId;
    if (typeof id !== "string" || !projectId.test(id))
      return res.status(400).json({ error: "Invalid project ID" });
    try {
      const record = await config.ecomodaMemory.read(id);
      res.json({ projectId: id, ...record });
    } catch (error) {
      next(error);
    }
  });
  const memoryUpdate = z
    .object({
      revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      memory: z.unknown(),
    })
    .strict();
  app.put("/api/ecomoda/memory/:projectId", auth, async (req, res, next) => {
    if (!config.ecomodaMemory)
      return res
        .status(503)
        .json({ error: "Ecomoda project memory is not configured" });
    const id = req.params.projectId;
    if (typeof id !== "string" || !projectId.test(id))
      return res.status(400).json({ error: "Invalid project ID" });
    const parsed = memoryUpdate.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid project memory update" });
    try {
      const record = await config.ecomodaMemory.update(
        id,
        parsed.data.memory as never,
        parsed.data.revision,
      );
      res.json({ projectId: id, ...record });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/revision conflict|update is busy/.test(message))
        return res
          .status(409)
          .json({ error: "Project memory changed. Reload before saving." });
      if (
        /memory|preferences|verifiedState|nextActions|credential|secret/.test(
          message,
        )
      )
        return res.status(400).json({ error: "Project memory was rejected" });
      next(error);
    }
  });
  app.get("/api/ecomoda/tasks/:id", auth, async (req, res, next) => {
    if (!config.ecomodaStore)
      return res
        .status(503)
        .json({ error: "Ecomoda persistence is not configured" });
    const id = req.params.id;
    if (
      typeof id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id)
    )
      return res.status(400).json({ error: "Invalid task ID" });
    try {
      const task = await config.ecomodaStore.inspect(id);
      if (!task.exists)
        return res.status(404).json({ error: "Task not found" });
      res.json({ task: { id, ...task } });
    } catch (error) {
      next(error);
    }
  });
  const ecomodaTask = z
    .object({
      id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/),
      task: z.string().trim().min(1).max(24000),
    })
    .strict();
  app.post("/api/ecomoda/tasks", auth, async (req, res, next) => {
    if (!config.ecomodaStore || !config.ecomodaInfer)
      return res
        .status(503)
        .json({ error: "Ecomoda inference is not connected" });
    const parsed = ecomodaTask.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid Ecomoda task" });
    try {
      const signal = AbortSignal.timeout(ecomodaTimeoutMs);
      const result = await runCycle({
        ...parsed.data,
        store: config.ecomodaStore,
        infer: config.ecomodaInfer,
        signal,
      });
      if (result.status === "skipped")
        return res
          .status(409)
          .json({ error: "Task is active or already completed" });
      res.status(201).json({
        task: {
          id: result.id,
          status: result.status,
          publishAllowed: false,
          verifiedRevenue: null,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        return res
          .status(504)
          .json({ error: "Ecomoda cycle timed out and can be retried" });
      next(error);
    }
  });
  const update = z
    .object({
      revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      workspace: workspaceSchema,
    })
    .strict();
  app.put("/api/workspace", auth, (req, res) => {
    const parsed = update.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
    const { workspace, revision } = parsed.data;
    const changed = db
      .prepare(
        "UPDATE workspaces SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?",
      )
      .run(JSON.stringify(workspace), "owner", revision);
    if (!changed.changes)
      return res.status(409).json({
        error: "Another tab changed this workspace. Reload before saving.",
      });
    res.json({ workspace, revision: revision + 1 });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  const dist = resolve(config.staticDir || "dist");
  app.use(
    express.static(dist, {
      index: false,
      maxAge: config.production ? "1h" : 0,
    }),
  );
  app.get("/{*path}", (req, res, next) => {
    if (req.path.includes(".")) return next();
    res.set("Cache-Control", "no-store");
    res.sendFile(resolve(dist, "index.html"));
  });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { type?: string; status?: number };
    if (e.type === "entity.too.large")
      return res.status(413).json({ error: "Workspace payload is too large" });
    if (e.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON" });
    if (e.status === 404)
      return res
        .status(404)
        .json({ error: "Build the frontend with npm run build" });
    console.error("Application request failed");
    res
      .status(500)
      .json({ error: "Server error. Changes have not been saved." });
  });
  return { app, close: () => db.close() };
}
