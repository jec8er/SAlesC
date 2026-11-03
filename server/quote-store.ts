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
  const enabled = Boolean(
    origin && secret && key && /^(sk|rk)_test_/.test(key),
  );
  app.get("/store/quote-kit", (req, res) => {
    res.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com",
    );
    const cost = Number(
      typeof req.query.cost === "string" ? req.query.cost : 200,
    );
    const margin = Number(
      typeof req.query.margin === "string" ? req.query.margin : 25,
    );
    const valid =
      Number.isFinite(cost) &&
      cost >= 0 &&
      cost <= 100000 &&
      Number.isFinite(margin) &&
      margin >= 0 &&
      margin <= 99;
    const dollars = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    });
    const price = valid
      ? dollars.format(
          Math.ceil(
            (Math.round(cost * 100) * 10000) /
              (10000 - Math.round(margin * 100)),
          ) / 100,
        )
      : "";
    res.set("Cache-Control", "no-store")
      .send(`<!doctype html><html lang="en"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>ORBIT Quote Kit</title>
      <style>body{margin:0;background:#eff5f2;color:#183329;font:17px/1.55 system-ui}main{max-width:42rem;margin:3rem auto;padding:1.5rem}section{background:white;border-radius:1rem;padding:1.5rem;margin:1.5rem 0}label{display:block;margin:.75rem 0}input,button{font:inherit;padding:.45rem}button{background:#165a48;color:white;border:0;border-radius:.4rem;cursor:pointer}</style>
      <main><p>ORBIT QUOTE KIT · FOR DIGITAL FREELANCERS</p>
      <h1>Turn your project costs into a client quote</h1>
      <p>Use the free calculator to decide what to charge for a website, design project, or other digital work. The full kit helps you turn that price into a quote you can send as a PDF.</p>
      <section><h2>Try the price calculator</h2>
      <form method="get" action="/store/quote-kit">
      <label>Total project cost (USD) <input name="cost" type="number" min="0" max="100000" step=".01" required value="${valid ? cost : 200}"></label>
      <label>Target margin (%) <input name="margin" type="number" min="0" max="99" step=".01" required value="${valid ? margin : 25}"></label>
      <button>Calculate price</button></form>
      <p role="status">${valid ? "Suggested price before tax: " + price : "Enter a valid job cost and a margin from 0% to 99%."}</p></section>
      <section><h2>Example: a five-page website</h2>
      <p>Six hours at an internal cost of $40 per hour, plus $60 in project expenses, totals $300. To keep 20% of the sale as profit, quote $375 before tax.</p>
      <p><a href="/store/quote-kit?cost=300&amp;margin=20">Try the website example</a></p></section>
      <section><h2>What comes in the full kit</h2>
      <ol><li>Break down project hours and expenses.</li><li>Add deliverables, revision limits, and deadlines to your quote, then save it as a PDF.</li><li>Set a follow-up date and use the included message templates.</li></ol>
      ${enabled ? "<p>Test checkout · USD 19 · No real charge</p>" : "<p>Checkout is currently unavailable.</p>"}
      ${enabled ? '<form method="post" action="/api/quote-kit/checkout"><button>Start test checkout</button></form>' : ""}
      </section></main></html>`);
  });

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
      return res.redirect(303, session.url);
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
      ${order.paid ? "" : '<meta http-equiv="refresh" content="5">'}
      <h1>Quote Kit order</h1>${
        order.paid
          ? '<p><a href="?download=1">Download the Quote Kit</a></p>'
          : "<p>Awaiting payment confirmation. This page checks automatically. Keep it open to get your download link.</p>"
      }</html>`);
  });
}
