import { createServer } from "node:http";
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

function setupPage(token) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set up ORBIT</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0b1420;color:#e5eef7;font:16px system-ui;min-height:100vh;display:grid;place-items:center;padding:24px}main{max-width:480px;width:100%;padding:36px;border:1px solid #294052;border-radius:20px;background:#111f2e}small{color:#70e6c5;letter-spacing:.15em}h1{font-size:36px}p{color:#a9bdcf;line-height:1.65}label{display:block;margin-top:20px}input,button{width:100%;padding:14px;border-radius:9px;margin-top:8px;font:inherit}input{background:#0a1622;color:white;border:1px solid #38516a}button{margin-top:24px;border:0;background:#73e7c5;color:#09201b;font-weight:700;cursor:pointer}button:disabled{opacity:.6}#status{min-height:40px}a{color:#73e7c5}</style>
<main><small>ORBIT / LOCAL SETUP</small><h1>Your private workspace.</h1><p>Create your owner password. Only its salted hash is saved on this computer. AI inference is disabled. No paid hosting is activated.</p>
<form><input type="hidden" name="csrf" value="${token}"><label>Owner password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="512" required></label><label>Confirm password<input name="confirm" type="password" autocomplete="new-password" minlength="12" maxlength="512" required></label><button>Create access and start ORBIT</button></form><p id="status" role="status" aria-live="polite"></p></main>
<script nonce="${token}">document.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),status=document.querySelector('#status'),values=Object.fromEntries(new FormData(form));if(values.password!==values.confirm){status.textContent='Passwords do not match.';return;}button.disabled=true;try{const response=await fetch('/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});const data=await response.json();if(!response.ok)throw Error(data.error);form.remove();status.textContent='Access created. ORBIT is starting; wait a few seconds before opening it.';const link=document.createElement('a');link.href='http://127.0.0.1:3001';link.textContent='Open ORBIT';status.after(link);}catch(error){status.textContent=error.message;button.disabled=false;}});</script></html>`;
}

export function createSetupServer({ root, onConfigured = () => {} }) {
  const envPath = resolve(root, ".env");
  if (existsSync(envPath)) throw Error("Owner access is already configured");
  const token = randomBytes(32).toString("hex");
  let failures = 0;
  let blockedUntil = 0;
  let configured = false;
  const server = createServer(async (req, res) => {
    const port = server.address()?.port;
    const origin = `http://127.0.0.1:${port}`;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'nonce-${token}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    );
    const reply = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.headers.host !== `127.0.0.1:${port}`)
      return reply(403, { error: "Use the local setup address" });
    if (configured || existsSync(envPath))
      return reply(409, { error: "Owner access is already configured" });
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(setupPage(token));
    }
    if (req.method !== "POST" || req.url !== "/setup")
      return reply(404, { error: "Not found" });
    if (
      req.headers.origin !== origin ||
      req.headers["sec-fetch-site"] === "cross-site"
    )
      return reply(403, { error: "Submit setup from the local page" });
    if (!req.headers["content-type"]?.startsWith("application/json"))
      return reply(415, { error: "Use JSON" });
    if (Date.now() < blockedUntil)
      return reply(429, { error: "Try again in 15 minutes" });
    try {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 8192)
          return reply(413, { error: "Setup request is too large" });
      }
      const data = JSON.parse(body);
      if (
        typeof data.csrf !== "string" ||
        Buffer.byteLength(data.csrf) !== Buffer.byteLength(token) ||
        !timingSafeEqual(Buffer.from(data.csrf), Buffer.from(token))
      )
        return reply(403, { error: "Invalid setup token" });
      if (
        typeof data.password !== "string" ||
        data.password.length < 12 ||
        data.password.length > 512 ||
        data.password !== data.confirm
      ) {
        failures++;
        if (failures >= 5) {
          blockedUntil = Date.now() + 900000;
          failures = 0;
        }
        return reply(400, { error: "Passwords must match (12–512 chars)" });
      }
      const salt = randomBytes(16).toString("hex");
      const key = scryptSync(data.password, salt, 64).toString("hex");
      const hash = `scrypt-v1:${salt}:${key}`;
      writeFileSync(
        envPath,
        `OWNER_PASSWORD_HASH=${hash}\nOWNER_NAME=Juan\nDATABASE_PATH=data/studio.sqlite\nHOST=127.0.0.1\nPORT=3001\nOLLAMA_AUTO_DISCOVER=false\n`,
        { flag: "wx", mode: 0o600 },
      );
      configured = true;
      reply(201, { configured: true });
      onConfigured();
    } catch {
      reply(400, { error: "Setup failed; configuration preserved" });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  return server;
}

export function superviseChild(child, host = process) {
  let stopping = false;
  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    child.kill(signal);
  };
  const interrupt = () => stop("SIGINT");
  const terminate = () => stop("SIGTERM");
  const cleanup = () => {
    host.removeListener("SIGINT", interrupt);
    host.removeListener("SIGTERM", terminate);
  };
  host.on("SIGINT", interrupt);
  host.on("SIGTERM", terminate);
  child.on("error", () => {
    cleanup();
    host.exitCode = 1;
    console.error("Unable to start ORBIT");
  });
  child.on("exit", (code) => {
    cleanup();
    host.exitCode = stopping ? 0 : (code ?? 1);
  });
  return child;
}

export function startLocal(
  root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
) {
  const launch = () => {
    const child = spawn(
      process.execPath,
      ["--env-file-if-exists=.env", "server/start.ts"],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: "3001",
          NODE_ENV: "development",
          PUBLIC_ORIGIN: "",
          ORBIT_LOCAL_PASSWORDLESS: "true",
          OLLAMA_AUTO_DISCOVER: "false",
          OLLAMA_MODEL: "",
          QWEN_LOCAL_ENDPOINT: "",
          QWEN_MODEL: "",
          QWEN_API_KEY: "",
        },
      },
    );
    return superviseChild(child);
  };
  console.log("Open ORBIT at http://127.0.0.1:3001 (no password required)");
  return launch();
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  startLocal();
