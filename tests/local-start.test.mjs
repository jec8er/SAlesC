import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scryptSync } from "node:crypto";
import { EventEmitter } from "node:events";
import { createSetupServer, superviseChild } from "../scripts/local-start.mjs";

async function fixture(t) {
  const prefix = join(tmpdir(), "orbit-setup-");
  const root = await mkdtemp(prefix);
  let configured = 0;
  const server = createSetupServer({
    root,
    onConfigured: () => configured++,
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(origin).then((r) => r.text());
  const csrf = page.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  t.after(async () => {
    await new Promise((done) => server.close(done));
    assert.ok(resolve(root).startsWith(resolve(prefix)));
    await rm(root, { recursive: true, force: true });
  });
  const post = (body, headers = {}) =>
    fetch(origin + "/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return { root, server, origin, csrf, post, configured: () => configured };
}

test("local setup saves only a compatible password hash and cannot be reused", async (t) => {
  const f = await fixture(t);
  const password = "sample-password-for-tests";
  const response = await f.post({
    csrf: f.csrf,
    password,
    confirm: password,
  });
  assert.equal(response.status, 201);
  const env = await readFile(join(f.root, ".env"), "utf8");
  assert.ok(!env.includes(password));
  assert.match(env, /OLLAMA_AUTO_DISCOVER=false/);
  const hash = env.match(/OWNER_PASSWORD_HASH=(.+)/)[1];
  const [version, salt, key] = hash.split(":");
  assert.equal(version, "scrypt-v1");
  assert.equal(scryptSync(password, salt, 64).toString("hex"), key);
  assert.equal(f.configured(), 1);
  assert.equal(
    (await f.post({ csrf: f.csrf, password, confirm: password })).status,
    409,
  );
  assert.equal(await readFile(join(f.root, ".env"), "utf8"), env);
});

test("local setup rejects other origins and missing tokens", async (t) => {
  const f = await fixture(t);
  const body = {
    csrf: f.csrf,
    password: "sample-password-for-tests",
    confirm: "sample-password-for-tests",
  };
  assert.equal(
    (await f.post(body, { Origin: "https://untrusted.example" })).status,
    403,
  );
  assert.equal((await f.post({ ...body, csrf: "incorrect" })).status, 403);
  assert.equal(f.configured(), 0);
  await assert.rejects(readFile(join(f.root, ".env")));
});

test("local setup rejects mismatched passwords and throttles repeated attempts", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await f.post({ csrf: f.csrf, password: "short", confirm: "wrong" }))
        .status,
      400,
    );
  assert.equal(
    (await f.post({ csrf: f.csrf, password: "short", confirm: "short" }))
      .status,
    429,
  );
  await assert.rejects(readFile(join(f.root, ".env")));
});

test("local setup never replaces an existing environment file", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.root, ".env"), "EXISTING_CONFIGURATION=true\n");
  assert.throws(
    () => createSetupServer({ root: f.root }),
    /already configured/,
  );
  assert.equal(
    (await f.post({ csrf: f.csrf, password: "unused", confirm: "unused" }))
      .status,
    409,
  );
  assert.equal(
    await readFile(join(f.root, ".env"), "utf8"),
    "EXISTING_CONFIGURATION=true\n",
  );
});

test("launcher forwards shutdown once and waits for the child to exit", () => {
  for (const signal of ["SIGTERM", "SIGINT"]) {
    const host = new EventEmitter();
    const child = new EventEmitter();
    const signals = [];
    child.kill = (value) => signals.push(value);
    assert.equal(superviseChild(child, host), child);
    host.emit(signal);
    host.emit(signal);
    assert.deepEqual(signals, [signal]);
    assert.equal(host.exitCode, undefined);
    child.emit("exit", null);
    assert.equal(host.exitCode, 0);
    assert.equal(host.listenerCount("SIGINT"), 0);
    assert.equal(host.listenerCount("SIGTERM"), 0);
  }
});

test("launcher preserves application failures", () => {
  const host = new EventEmitter();
  const child = new EventEmitter();
  superviseChild(child, host);
  child.emit("exit", 2);
  assert.equal(host.exitCode, 2);
  assert.equal(host.listenerCount("SIGTERM"), 0);
});
