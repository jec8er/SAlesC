import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createApplication } from "../server/app.ts";
import { passwordHash } from "../server/auth.ts";
import type { Inquiry } from "../lib/service-desk.ts";
import { quoteText } from "../lib/service-desk.ts";

test("service desk preserves reviewed quote versions and follow-ups with auth, revision and restart protection", async () => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-service-"));
  const path = join(dir, "fixture.sqlite");
  const pass = "service-desk-test-fixture";
  const hash = passwordHash(pass);
  async function launch() {
    const runtime = createApplication({
      databasePath: path,
      passwordHash: hash,
    });
    const server = runtime.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw Error("No listener");
    return {
      origin: `http://127.0.0.1:${address.port}`,
      close: async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        runtime.close();
      },
    };
  }
  let server = await launch();
  async function login() {
    const response = await fetch(server.origin + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    assert.equal(response.status, 200);
    const { csrf } = (await response.json()) as { csrf: string };
    return {
      "Content-Type": "application/json",
      Cookie: (response.headers.get("set-cookie") || "").split(";")[0],
      "X-CSRF-Token": csrf,
    };
  }
  try {
    assert.equal(
      (await fetch(server.origin + "/api/service/inquiries")).status,
      401,
    );
    let headers = await login();
    const input = {
      id: randomUUID(),
      customer: "Demo Cleaning",
      contact: "fixture only",
      request: "One authorized cleaning inquiry",
      source: "referral",
    };
    const endpoint = "/api/service/inquiries";
    async function post(path: string, body: unknown, customHeaders = headers) {
      return fetch(server.origin + path, {
        method: "POST",
        headers: customHeaders,
        body: JSON.stringify(body),
      });
    }
    assert.equal(
      (await post(endpoint, input, { ...headers, "X-CSRF-Token": "invalid" }))
        .status,
      403,
    );
    let response = await post(endpoint, input);
    assert.equal(response.status, 201);
    let inquiry = ((await response.json()) as { inquiry: Inquiry }).inquiry;
    assert.equal((await post(endpoint, input)).status, 409);
    const actionPath = `${endpoint}/${input.id}/actions`;
    const quoteId = randomUUID();
    const quote = {
      action: "quote",
      revision: 0,
      quoteId,
      scope: "Two rooms; supplies included",
      amountCents: 12550,
      pricingNotes: "Fixture total; no actual tax determination",
    };
    assert.equal(
      (await post(actionPath, { ...quote, amountCents: 125.5 })).status,
      400,
    );
    response = await post(actionPath, quote);
    assert.equal(response.status, 200);
    inquiry = ((await response.json()) as { inquiry: Inquiry }).inquiry;
    assert.equal(inquiry.quotes[0].amountCents, 12550);
    assert.equal(inquiry.quotes[0].approvedAt, null);
    assert.equal(
      (
        await post(actionPath, {
          action: "approve-quote",
          revision: 0,
          quoteId,
        })
      ).status,
      409,
    );
    response = await post(actionPath, {
      action: "approve-quote",
      revision: 1,
      quoteId,
    });
    assert.equal(response.status, 200);
    inquiry = ((await response.json()) as { inquiry: Inquiry }).inquiry;
    assert.ok(inquiry.quotes[0].approvedAt);
    const secondId = randomUUID();
    response = await post(actionPath, {
      ...quote,
      revision: 2,
      quoteId: secondId,
      amountCents: 13000,
    });
    assert.equal(response.status, 200);
    inquiry = ((await response.json()) as { inquiry: Inquiry }).inquiry;
    assert.ok(inquiry.quotes[0].approvedAt);
    assert.equal(inquiry.quotes[1].approvedAt, null);
    assert.equal(
      (
        await post(actionPath, {
          action: "approve-quote",
          revision: 3,
          quoteId,
        })
      ).status,
      400,
    );
    const taskId = randomUUID();
    assert.equal(
      (
        await post(actionPath, {
          action: "follow-up",
          revision: 3,
          taskId,
          title: "Review quote",
          due: "2026-02-30",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post(actionPath, {
          action: "follow-up",
          revision: 3,
          taskId,
          title: "Review quote",
          due: "2026-11-05",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await post(actionPath, {
          action: "complete-follow-up",
          revision: 4,
          taskId,
        })
      ).status,
      200,
    );
    assert.equal(
      (await post(actionPath, { action: "status", revision: 5, status: "won" }))
        .status,
      200,
    );
    const workspaceBeforeRestart = await fetch(
      server.origin + "/api/workspace",
      { headers },
    );
    assert.equal(
      (
        (await workspaceBeforeRestart.json()) as {
          workspace: { receipts: unknown[] };
        }
      ).workspace.receipts.length,
      0,
    );
    await server.close();
    server = await launch();
    headers = await login();
    const stored = await fetch(server.origin + endpoint, { headers });
    assert.equal(stored.status, 200);
    const records = ((await stored.json()) as { inquiries: Inquiry[] })
      .inquiries;
    assert.equal(records.length, 1);
    assert.equal(records[0].revision, 6);
    assert.equal(records[0].status, "won");
    assert.equal(records[0].quotes.length, 2);
    assert.equal(records[0].quotes[1].approvedAt, null);
    const exported = quoteText(records[0]);
    assert.ok(exported.includes("$130.00"));
    assert.ok(exported.includes("DRAFT — owner review required"));
    assert.ok(
      !exported.includes(
        "Owner-approved draft; customer acceptance not recorded",
      ),
    );
    assert.ok(records[0].followUps[0].completedAt);
    assert.equal(records[0].events.length, 7);
  } finally {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
