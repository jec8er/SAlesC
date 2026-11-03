import type { Express } from "express";
import express from "express";
import Stripe from "stripe";
import type { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { digest } from "./auth.ts";

const kit = fileURLToPath(
  new URL("../products/orbit-quote-kit.html", import.meta.url),
);
const amount = 1900;

export function mountQuoteStore(
  app: Express,
  db: DatabaseSync,
  origin?: string,
  credentials = {
    key: process.env.QUOTE_KIT_STRIPE_TEST_KEY,
    secret: process.env.QUOTE_KIT_WEBHOOK_SECRET,
  },
) {
  const { key, secret } = credentials;
  if (!origin || !secret || !key || !/^(sk|rk)_test_/.test(key)) return;
  const stripe = new Stripe(key, { timeout: 10000, maxNetworkRetries: 1 });
  db.exec(`CREATE TABLE IF NOT EXISTS quote_kit_orders (
    id TEXT PRIMARY KEY, grant_hash TEXT NOT NULL, session_id TEXT UNIQUE,
    paid INTEGER NOT NULL DEFAULT 0
  )`);

  app.post(
    "/api/quote-kit/webhook",
    express.raw({ type: "application/json", limit: "100kb" }),
    (req, res) => {
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          req.get("stripe-signature") || "",
          secret,
        );
      } catch {
        return res.sendStatus(400);
      }
      if (
        event.livemode ||
        (event.type !== "checkout.session.completed" &&
          event.type !== "checkout.session.async_payment_succeeded")
      )
        return res.sendStatus(204);
      const session = event.data.object;
      if (
        session.metadata?.product !== "orbit-quote-kit" ||
        session.mode !== "payment" ||
        session.payment_status !== "paid" ||
        session.amount_total !== amount ||
        session.currency !== "usd" ||
        !session.metadata.order
      )
        return res.sendStatus(204);
      const result = db
        .prepare(
          "UPDATE quote_kit_orders SET paid=1 WHERE id=? AND session_id=?",
        )
        .run(session.metadata.order, session.id);
      return res.sendStatus(result.changes ? 204 : 503);
    },
  );

  app.get("/store/quote-kit", (_req, res) => {
    res.set("Cache-Control", "no-store")
      .send(`<!doctype html><html lang="en"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>ORBIT Quote Kit</title><main><h1>ORBIT Quote Kit</h1>
      <p>Price cleaning jobs, print customer quotes, and track follow-ups.</p>
      <p>Test checkout · USD 19 · No real charge</p>
      <form method="post" action="/api/quote-kit/checkout"><button>Start test checkout</button></form>
      </main></html>`);
  });

  app.post("/api/quote-kit/checkout", async (req, res) => {
    if (req.get("origin") !== origin) return res.sendStatus(403);
    const id = randomBytes(16).toString("hex");
    const grant = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO quote_kit_orders(id,grant_hash) VALUES(?,?)").run(
      id,
      digest(grant),
    );
    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: amount,
                product_data: { name: "ORBIT Quote Kit" },
              },
            },
          ],
          metadata: { product: "orbit-quote-kit", order: id },
          success_url: origin + "/store/quote-kit/order/" + id,
          cancel_url: origin + "/store/quote-kit",
        },
        { idempotencyKey: id },
      );
      if (
        !session.url ||
        new URL(session.url).origin !== "https://checkout.stripe.com"
      )
        return res.sendStatus(502);
      db.prepare("UPDATE quote_kit_orders SET session_id=? WHERE id=?").run(
        session.id,
        id,
      );
      res.cookie("orbit_quote_grant", grant, {
        httpOnly: true,
        secure: origin.startsWith("https:"),
        sameSite: "lax",
        path: "/store/quote-kit/order/" + id,
        maxAge: 30 * 86400000,
      });
      return res.send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Test checkout</title>
        <p><a href="${session.url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}">Continue to Stripe test checkout</a></p></html>`);
    } catch {
      return res.sendStatus(502);
    }
  });

  app.get("/store/quote-kit/order/:id", (req, res) => {
    res.set("Cache-Control", "no-store");
    const grant = /(?:^|;\s*)orbit_quote_grant=([a-f0-9]{64})(?:;|$)/.exec(
      req.get("cookie") || "",
    )?.[1];
    if (!grant) return res.sendStatus(404);
    const order = db
      .prepare("SELECT paid FROM quote_kit_orders WHERE id=? AND grant_hash=?")
      .get(req.params.id, digest(grant));
    if (!order) return res.sendStatus(404);
    if (order.paid && req.query.download === "1")
      return res.download(kit, "ORBIT-Quote-Kit.html");
    return res.send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Quote Kit order</title>
      <h1>Quote Kit order</h1>${
        order.paid
          ? '<p><a href="?download=1">Download the Quote Kit</a></p>'
          : '<p>Awaiting payment confirmation. <a href="?">Check again</a>.</p>'
      }</html>`);
  });
}
