import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplication } from "../server/app.ts";
import { passwordHash } from "../server/auth.ts";
import { emptyWorkspace } from "../lib/domain.ts";
import { createFileStore } from "../lib/ecomoda-file-store.mjs";
const testPassword = "fixture-password-not-a-real-credential";
const hash = passwordHash(testPassword);
async function running(databasePath = ":memory:", extra = {}) {
  const runtime = createApplication({
    databasePath,
    passwordHash: hash,
    ...extra,
  });
  const listener = runtime.app.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    close: async () => {
      await new Promise<void>((r) => listener.close(() => r()));
      runtime.close();
    },
  };
}
async function login(origin: string) {
  const r = await fetch(origin + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: testPassword }),
  });
  assert.equal(r.status, 200);
  const { csrf } = (await r.json()) as { csrf: string };
  return { cookie: r.headers.get("set-cookie")!.split(";")[0], csrf };
}
test("private records reject anonymous callers and spoofed Sites identity headers", async () => {
  const s = await running();
  try {
    const r = await fetch(s.origin + "/api/workspace", {
      headers: {
        "oai-authenticated-user-id": "owner",
        "oai-authenticated-user-email": "test@example.com",
      },
    });
    assert.equal(r.status, 401);
  } finally {
    await s.close();
  }
});
test("real login, SQLite save, revision conflict, CSRF and origin enforcement", async () => {
  const s = await running();
  try {
    const a = await login(s.origin);
    const headers = {
      "Content-Type": "application/json",
      Cookie: a.cookie,
      "X-CSRF-Token": a.csrf,
    };
    const initial = (await fetch(s.origin + "/api/workspace", { headers }).then(
      (r) => r.json(),
    )) as { revision: number };
    assert.equal(initial.revision, 0);
    const w = emptyWorkspace();
    w.deals.push({
      id: "d1",
      name: "Test opportunity",
      contact: "",
      stage: "won",
      value: 199,
      nextAction: "",
      due: "",
      notes: "",
    });
    const body = JSON.stringify({ workspace: w, revision: 0 });
    let r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers,
      body,
    });
    assert.equal(r.status, 200);
    r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers,
      body,
    });
    assert.equal(r.status, 409);
    r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers: { ...headers, "X-CSRF-Token": "wrong" },
      body,
    });
    assert.equal(r.status, 403);
    r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers: { ...headers, Origin: "https://evil.example" },
      body,
    });
    assert.equal(r.status, 403);
    const stored = (await fetch(s.origin + "/api/workspace", { headers }).then(
      (r) => r.json(),
    )) as { revision: number; workspace: { deals: unknown[] } };
    assert.equal(stored.revision, 1);
    assert.equal(stored.workspace.deals.length, 1);
    r = await fetch(s.origin + "/api/logout", { method: "POST", headers });
    assert.equal(r.status, 200);
    r = await fetch(s.origin + "/api/workspace", { headers });
    assert.equal(r.status, 401);
  } finally {
    await s.close();
  }
});
test("invalid JSON and invalid payment records are rejected without saving", async () => {
  const s = await running();
  try {
    const a = await login(s.origin);
    const headers = {
      "Content-Type": "application/json",
      Cookie: a.cookie,
      "X-CSRF-Token": a.csrf,
    };
    let r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers,
      body: "{broken",
    });
    assert.equal(r.status, 400);
    const w = emptyWorkspace();
    w.receipts.push({
      id: "r",
      label: "Unproven",
      kind: "service",
      currency: "USD",
      gross: 199,
      cost: 0,
      fees: 0,
      refund: 0,
      status: "paid",
      reference: "",
      date: "2026-10-11",
    });
    r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers,
      body: JSON.stringify({ workspace: w, revision: 0 }),
    });
    assert.equal(r.status, 400);
    const data = (await fetch(s.origin + "/api/workspace", { headers }).then(
      (r) => r.json(),
    )) as { revision: number };
    assert.equal(data.revision, 0);
  } finally {
    await s.close();
  }
});
test("five failed passwords trigger login throttling", async () => {
  const s = await running();
  try {
    for (let i = 0; i < 5; i++) {
      const r = await fetch(s.origin + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "incorrect-password" }),
      });
      assert.equal(r.status, 401);
    }
    const r = await fetch(s.origin + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: testPassword }),
    });
    assert.equal(r.status, 429);
  } finally {
    await s.close();
  }
});
test("records survive a server restart with the same SQLite file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "studio-test-"));
  const file = join(dir, "test.sqlite");
  let s = await running(file);
  try {
    const a = await login(s.origin);
    const w = emptyWorkspace();
    w.settings.target = 5432;
    const r = await fetch(s.origin + "/api/workspace", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: a.cookie,
        "X-CSRF-Token": a.csrf,
      },
      body: JSON.stringify({ workspace: w, revision: 0 }),
    });
    assert.equal(r.status, 200);
    await s.close();
    s = await running(file);
    const b = await login(s.origin);
    const stored = (await fetch(s.origin + "/api/workspace", {
      headers: { Cookie: b.cookie },
    }).then((r) => r.json())) as {
      workspace: { settings: { target: number } };
    };
    assert.equal(stored.workspace.settings.target, 5432);
  } finally {
    await s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("production startup requires HTTPS origin and uses secure session cookies", async () => {
  assert.throws(
    () =>
      createApplication({
        databasePath: ":memory:",
        passwordHash: hash,
        production: true,
      }),
    /PUBLIC_ORIGIN/,
  );
  assert.throws(
    () =>
      createApplication({
        databasePath: ":memory:",
        passwordHash: hash,
        production: true,
        publicOrigin: "http://example.com",
      }),
    /HTTPS/,
  );
  const s = await running(":memory:", {
    production: true,
    publicOrigin: "https://studio.example",
  });
  try {
    const r = await fetch(s.origin + "/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://studio.example",
      },
      body: JSON.stringify({ password: testPassword }),
    });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie") || "", /HttpOnly/);
    assert.match(r.headers.get("set-cookie") || "", /Secure/);
    assert.match(r.headers.get("set-cookie") || "", /SameSite=Strict/);
  } finally {
    await s.close();
  }
});
test("authenticated task status is private, bounded and redacted", async () => {
  const inspect = async (id: string) => id === "known"
    ? { exists: true, status: "checkpointed", checkpointCount: 2, updatedAt: "2026-10-11T09:00:00.000Z", resultStatus: null }
    : { exists: false, status: "missing", checkpointCount: 0 };
  const s = await running(":memory:", { ecomodaStore: { inspect } });
  try {
    assert.equal((await fetch(s.origin + "/api/ecomoda/tasks/known")).status, 401);
    const a = await login(s.origin);
    const headers = { Cookie: a.cookie };
    let r = await fetch(s.origin + "/api/ecomoda/tasks/known", { headers });
    assert.equal(r.status, 200);
    const body = await r.json() as { task: Record<string, unknown> };
    assert.deepEqual(body.task, { id: "known", exists: true, status: "checkpointed", checkpointCount: 2, updatedAt: "2026-10-11T09:00:00.000Z", resultStatus: null });
    assert.equal(JSON.stringify(body).includes("output"), false);
    r = await fetch(s.origin + "/api/ecomoda/tasks/missing", { headers });
    assert.equal(r.status, 404);
    r = await fetch(s.origin + "/api/ecomoda/tasks/%2e%2e%2fsecret", { headers });
    assert.ok([400, 404].includes(r.status));
  } finally { await s.close(); }
});
test("cycle creation requires configured inference and returns only redacted state", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ecomoda-api-"));
  const store = createFileStore(dir);
  let s = await running(":memory:", { ecomodaStore: store });
  try {
    const a = await login(s.origin);
    const headers = { "Content-Type": "application/json", Cookie: a.cookie, "X-CSRF-Token": a.csrf };
    let r = await fetch(s.origin + "/api/ecomoda/tasks", { method: "POST", headers, body: JSON.stringify({ id: "job", task: "private work" }) });
    assert.equal(r.status, 503);
    await s.close();
    const outputs = ["plan secret", "draft secret", '{"accepted":true,"defects":[]}'];
    s = await running(":memory:", { ecomodaStore: store, ecomodaInfer: async () => outputs.shift()! });
    const b = await login(s.origin);
    const authorized = { "Content-Type": "application/json", Cookie: b.cookie, "X-CSRF-Token": b.csrf };
    r = await fetch(s.origin + "/api/ecomoda/tasks", { method: "POST", headers: authorized, body: JSON.stringify({ id: "job", task: "private work" }) });
    assert.equal(r.status, 201);
    const text = await r.text();
    assert.equal(text.includes("secret"), false);
    assert.deepEqual(JSON.parse(text).task, { id: "job", status: "awaiting_artifact_validation", publishAllowed: false, verifiedRevenue: null });
    r = await fetch(s.origin + "/api/ecomoda/tasks", { method: "POST", headers: authorized, body: JSON.stringify({ id: "job", task: "private work" }) });
    assert.equal(r.status, 409);
  } finally {
    await s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
