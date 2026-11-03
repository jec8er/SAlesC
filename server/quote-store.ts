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
  db.exec(`CREATE TABLE IF NOT EXISTS quote_kit_metrics (
    source TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL,
    PRIMARY KEY (source, event)
  )`);
  const incrementMetric = db.prepare(
    "INSERT INTO quote_kit_metrics VALUES (?, ?, 1) ON CONFLICT(source, event) DO UPDATE SET count=count+1",
  );
  const enabled = Boolean(
    origin && secret && key && /^(sk|rk)_test_/.test(key),
  );
  app.get("/store/quote-kit", (req, res) => {
    const source =
      typeof req.query.source === "string" &&
      /^(guide|community|direct)$/.test(req.query.source)
        ? req.query.source
        : "direct";
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
    if (req.method === "GET") {
      if (req.query.cost === undefined && req.query.margin === undefined)
        incrementMetric.run(source, "page_view");
      else if (
        valid &&
        typeof req.query.cost === "string" &&
        typeof req.query.margin === "string"
      )
        incrementMetric.run(source, "calculation");
    }
    res.set("Cache-Control", "no-store")
      .send(`<!doctype html><html lang="en"><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>ORBIT Quote Kit</title>
      <style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 8% 0%,#c5e6ff,transparent 52%),radial-gradient(ellipse at 95% 24%,#d6f6e8,transparent 55%),#f4f5fa;color:#13283d;font:16px/1.55 system-ui,sans-serif}
main{max-width:48rem;margin:auto;padding:clamp(1rem,5vw,3rem)}
main>p:first-child,small{font-size:.73rem;font-weight:750;letter-spacing:.13em;color:#34586b}
h1{font-size:clamp(2.15rem,7vw,4rem);line-height:1.04;letter-spacing:-.06em;margin:.4em 0}
h2{font-size:1.25rem;margin:0 0 .75rem}h3{margin:.5rem 0}
section{background:#ffffff8c;border:1px solid #ffffffeb;border-radius:1.65rem;padding:clamp(1rem,4vw,1.65rem);margin:1rem 0;backdrop-filter:blur(20px);box-shadow:0 14px 38px #25426417,inset 0 1px 1px white}
label{display:block;margin:.7rem 0;font-weight:600}
input,button{font:inherit;padding:.55rem .8rem;border-radius:.75rem}
input{background:#ffffffbd;border:1px solid #70899e;color:inherit;max-width:100%}
button{background:#173956;color:white;border:1px solid #ffffff70;cursor:pointer;font-weight:650}
button:hover{background:#254e70}
:focus-visible{outline:3px solid #236ca1;outline-offset:3px}
[role=status]{margin-bottom:0;padding:.75rem 1rem;border-radius:.85rem;background:#e4f4ff;color:#163b59;font-weight:750}
summary{cursor:pointer;font-weight:700}ol{padding-left:1.25rem}
</style>
      <main><p>ORBIT QUOTE KIT · FOR DIGITAL FREELANCERS</p>
      <h1>Turn your project costs into a client quote</h1>
      <p>Use the free calculator to decide what to charge for a website, design project, or other digital work. The full kit helps you turn that price into a quote you can send as a PDF.</p>
      <section><h2>Try the price calculator</h2>
      <form method="get" action="/store/quote-kit">
      <input type="hidden" name="source" value="${source}">
      <label>Total project cost (USD) <input name="cost" type="number" min="0" max="100000" step=".01" required value="${valid ? cost : 200}"></label>
      <label>Target margin (%) <input name="margin" type="number" min="0" max="99" step=".01" required value="${valid ? margin : 25}"></label>
      <button>Calculate price</button></form>
      <p role="status">${valid ? "Suggested price before tax: " + price : "Enter a valid job cost and a margin from 0% to 99%."}</p></section>
      <section><h2>Example: a five-page website</h2>
      <p>Six hours at an internal cost of $40 per hour, plus $60 in project expenses, totals $300. To keep 20% of the sale as profit, quote $375 before tax.</p>
      <details><summary>See the client quote</summary>
      <article style="margin-top:1rem;padding:1.25rem;border:1px solid #b8cec4;border-left:4px solid #165a48;border-radius:.5rem">
      <small>SAMPLE CLIENT QUOTE</small>
      <h3>Five-page website</h3>
      <p><strong>Deliverables</strong><br>Five responsive pages and a handoff guide.</p>
      <p><strong>Timeline</strong><br>Ten business days after receiving content.</p>
      <p><strong>Revisions</strong><br>One round included.</p>
      <p><strong>Total before tax · $375.00</strong></p>
      </article></details></section>
      <section><h2>What comes in the full kit</h2>
      <ol><li>Break down project hours and expenses.</li><li>Add deliverables, revision limits, and deadlines to your quote, then save it as a PDF.</li><li>Set a follow-up date and use the included message templates.</li></ol>
      ${enabled ? "<p>Test checkout · USD 19 · No real charge</p>" : "<p>Checkout is currently unavailable.</p>"}
      ${enabled ? `<form method="post" action="/api/quote-kit/checkout?source=${source}"><button>Start test checkout</button></form>` : ""}
      </section></main></html>`);
  });

  if (!origin || !secret || !key || !/^(sk|rk)_test_/.test(key)) return;
  const stripe = new Stripe(key, { timeout: 10000, maxNetworkRetries: 1 });
  db.exec(`CREATE TABLE IF NOT EXISTS quote_kit_orders (
    id TEXT PRIMARY KEY, grant_hash TEXT NOT NULL, session_id TEXT UNIQUE,
    paid INTEGER NOT NULL DEFAULT 0
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS quote_kit_order_sources (
    order_id TEXT PRIMARY KEY REFERENCES quote_kit_orders(id), source TEXT NOT NULL
  );
  DROP TRIGGER IF EXISTS quote_kit_count_purchase;
  CREATE TRIGGER quote_kit_count_purchase
  AFTER UPDATE OF paid ON quote_kit_orders
  WHEN OLD.paid <> 1 AND NEW.paid = 1
  BEGIN
    INSERT INTO quote_kit_metrics VALUES (
      COALESCE((SELECT source FROM quote_kit_order_sources WHERE order_id = NEW.id), 'direct'),
      'paid_order', 1
    ) ON CONFLICT(source, event) DO UPDATE SET count=count+1;
  END;`);

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
          event.type !== "checkout.session.async_payment_succeeded" &&
          event.type !== "checkout.session.async_payment_failed" &&
          event.type !== "checkout.session.expired")
      )
        return res.sendStatus(204);
      const session = event.data.object;
      const failed =
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired";
      if (
        session.metadata?.product !== "orbit-quote-kit" ||
        session.mode !== "payment" ||
        (!failed && session.payment_status !== "paid") ||
        session.amount_total !== amount ||
        session.currency !== "usd" ||
        !session.metadata.order
      )
        return res.sendStatus(204);
      const result = db
        .prepare(
          "UPDATE quote_kit_orders SET paid=CASE WHEN paid=1 THEN 1 ELSE ? END WHERE id=? AND session_id=?",
        )
        .run(failed ? -1 : 1, session.metadata.order, session.id);
      return res.sendStatus(result.changes ? 204 : 503);
    },
  );

  app.post("/api/quote-kit/checkout", async (req, res) => {
    if (req.get("origin") !== origin) return res.sendStatus(403);
    const source =
      req.query.source === "guide" || req.query.source === "community"
        ? req.query.source
        : "direct";
    const id = randomBytes(16).toString("hex");
    const grant = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO quote_kit_orders(id,grant_hash) VALUES(?,?)").run(
      id,
      digest(grant),
    );
    try {
      db.prepare("INSERT INTO quote_kit_order_sources VALUES (?, ?)").run(
        id,
        source,
      );
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
      incrementMetric.run(source, "checkout_start");
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
    if (order.paid === 1 && req.query.download === "1")
      return res.download(kit, "ORBIT-Quote-Kit.html");
    return res.send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Quote Kit order</title>
      ${order.paid === 0 ? '<meta http-equiv="refresh" content="5">' : ""}
      <h1>Quote Kit order</h1>${
        order.paid === 1
          ? '<p><a href="?download=1">Download the Quote Kit</a></p>'
          : order.paid === -1
            ? '<p>Payment did not complete. <a href="/store/quote-kit">Return to the storefront to try again.</a></p>'
            : "<p>Awaiting payment confirmation. This page checks automatically. Keep it open to get your download link.</p>"
      }</html>`);
  });
}
