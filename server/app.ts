import express from "express";
import type { Request, Response, NextFunction } from "express";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { emptyWorkspace, workspaceSchema } from "../lib/domain.ts";
import { digest, verifyPassword, validPasswordHash } from "./auth.ts";
export type Config = {
  databasePath: string;
  passwordHash: string;
  name?: string;
  production?: boolean;
  publicOrigin?: string;
  staticDir?: string;
  now?: () => number;
  ecomodaStore?: {
    inspect: (id: string) => Promise<{
      exists: boolean;
      status: string;
      checkpointCount: number;
      updatedAt?: string | null;
      resultStatus?: string | null;
    }>;
  };
};
export function createApplication(config: Config) {
  if (!validPasswordHash(config.passwordHash))
    throw Error("Set OWNER_PASSWORD_HASH using npm run password:hash");
  const now = config.now || Date.now;
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
    "CREATE TABLE IF NOT EXISTS workspaces (owner_id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);",
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
      "Referrer-Policy": "same-origin",
      "Permissions-Policy": "microphone=(self)",
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
  app.get("/api/workspace", auth, (_req, res) => {
    const row = db
      .prepare("SELECT payload,revision FROM workspaces WHERE owner_id=?")
      .get("owner") as { payload: string; revision: number };
    res.json({ workspace: JSON.parse(row.payload), revision: row.revision });
  });
  app.get("/api/ecomoda/tasks/:id", auth, async (req, res, next) => {
    if (!config.ecomodaStore)
      return res.status(503).json({ error: "Ecomoda persistence is not configured" });
    const id = req.params.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id))
      return res.status(400).json({ error: "Invalid task ID" });
    try {
      const task = await config.ecomodaStore.inspect(id);
      if (!task.exists) return res.status(404).json({ error: "Task not found" });
      res.json({ task: { id, ...task } });
    } catch (error) { next(error); }
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
