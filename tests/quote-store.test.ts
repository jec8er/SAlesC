import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import Stripe from "stripe";
import { digest } from "../server/auth.ts";
import { mountQuoteStore } from "../server/quote-store.ts";

test("only a signed matching paid test session unlocks the buyer's download", async (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  const app = express();
  const secret = "whsec_local_fixture";
  const key = "sk_test_local_fixture";
  const grant = "a".repeat(64);
  const stripe = new Stripe(key);
  mountQuoteStore(app, db, "http://localhost", { key, secret });
  db.prepare("INSERT INTO quote_kit_orders VALUES(?,?,?,0)").run(
    "order",
    digest(grant),
    "cs_test_order",
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  t.after(() => {
    server.close();
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = "http://127.0.0.1:" + address.port;
  const download = origin + "/store/quote-kit/order/order?download=1";
  const buyer = { cookie: "orbit_quote_grant=" + grant };
  const send = (status: string, amount: number, signed = true) => {
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_order",
          mode: "payment",
          currency: "usd",
          payment_status: status,
          amount_total: amount,
          metadata: { product: "orbit-quote-kit", order: "order" },
        },
      },
    });
    return fetch(origin + "/api/quote-kit/webhook", {
      method: "POST",
      body: payload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": signed
          ? stripe.webhooks.generateTestHeaderString({ payload, secret })
          : "invalid",
      },
    });
  };
  assert.equal((await send("paid", 1900, false)).status, 400);
  assert.equal((await send("unpaid", 1900)).status, 204);
  assert.equal((await send("paid", 1)).status, 204);
  assert.match(
    await (await fetch(download, { headers: buyer })).text(),
    /Awaiting payment/,
  );
  assert.equal((await send("paid", 1900)).status, 204);
  assert.equal((await send("paid", 1900)).status, 204);
  assert.equal((await fetch(download)).status, 404);
  const result = await fetch(download, { headers: buyer });
  assert.match(result.headers.get("content-disposition") || "", /attachment/);
  assert.match(await result.text(), /<title>ORBIT Quote Kit<\/title>/);
});
