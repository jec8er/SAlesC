import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { resolve, join } from "node:path";

const state = resolve(process.env.ORBIT_HOST_STATE || "work/orbit-host-state");
const pointer = join(state, "current");
const [command, argument] = process.argv.slice(2);

async function activate(id) {
  const temp = join(state, randomUUID() + ".tmp");
  await writeFile(temp, id);
  await rename(temp, pointer);
}

if (command === "deploy") {
  const page = await readFile(argument);
  if (page.length > 2_000_000 || !/^<!doctype html>/i.test(page.toString("utf8")))
    throw new Error("Expected a standalone HTML document under 2 MB");
  const id = createHash("sha256").update(page).digest("hex");
  await mkdir(state, { recursive: true });
  await writeFile(join(state, id + ".html"), page, { flag: "wx" }).catch(error => {
    if (error.code !== "EEXIST") throw error;
  });
  await activate(id);
  console.log(id);
} else if (command === "rollback") {
  if (!/^[a-f0-9]{64}$/.test(argument || "")) throw new Error("Invalid release ID");
  await readFile(join(state, argument + ".html"));
  await activate(argument);
} else if (command === "serve") {
  createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/") {
      res.writeHead(404).end();
      return;
    }
    try {
      const id = await readFile(pointer, "utf8");
      if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid release pointer");
      const page = await readFile(join(state, id + ".html"));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
        "Cache-Control": "no-store",
      }).end(page);
    } catch {
      res.writeHead(503).end("No active release");
    }
  }).listen(Number(process.env.PORT || 3020), "127.0.0.1");
} else {
  throw new Error("Use deploy <html>, rollback <release-id>, or serve");
}
