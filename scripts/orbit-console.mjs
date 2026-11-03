import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const origin = "http://127.0.0.1:3021";
const state = resolve(process.env.ORBIT_HOST_STATE || "work/orbit-host-state");
const engine = fileURLToPath(new URL("./orbit-host.mjs", import.meta.url));
const releasePattern = /^[a-f0-9]{64}$/;

function run(command, argument) {
  return spawnSync(process.execPath, [engine, command, argument], {
    env: { ...process.env, ORBIT_HOST_STATE: state },
    timeout: 10000,
  }).status === 0;
}

createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  try {
    if (req.headers.host !== "127.0.0.1:3021") return res.writeHead(403).end();
    if (req.method === "GET" && req.url === "/") {
      const page = await readFile(new URL("./orbit-console.html", import.meta.url));
      return res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page);
    }
    if (req.method === "GET" && req.url === "/releases") {
      const files = await readdir(state).catch(error => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      const current = await readFile(join(state, "current"), "utf8").catch(error => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      const releases = files.map(name => name.replace(/\.html$/, "")).filter(id => releasePattern.test(id));
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ current, releases }));
    }
    if (req.method !== "POST") return res.writeHead(404).end();
    if (req.headers.origin !== origin) return res.writeHead(403).end();
    if (req.url?.startsWith("/rollback/")) {
      const id = req.url.slice(10);
      return res.writeHead(releasePattern.test(id) && run("rollback", id) ? 204 : 400).end();
    }
    if (req.url !== "/deploy") return res.writeHead(404).end();
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2_000_000) return res.writeHead(413).end("Maximum file size is 2 MB.");
      chunks.push(chunk);
    }
    const folder = await mkdtemp(join(tmpdir(), "orbit-release-"));
    try {
      const file = join(folder, "index.html");
      await writeFile(file, Buffer.concat(chunks));
      return res.writeHead(run("deploy", file) ? 204 : 400).end();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(3021, "127.0.0.1");
