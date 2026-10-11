import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyWorkspace,
  metrics,
  workspaceSchema,
  catalogHTML,
  proposalHTML,
  dealReadiness,
  salesQueue,
  followUpText,
  outreachPack,
} from "../lib/domain.ts";
const receipt = {
  id: "r",
  label: "Setup",
  kind: "service" as const,
  currency: "USD" as const,
  gross: 199,
  cost: 40,
  fees: 6,
  refund: 0,
  status: "paid" as const,
  reference: "receipt-1",
  date: "2026-10-11",
};
test("pending revenue and won deals never inflate collected revenue", () => {
  const w = emptyWorkspace();
  w.receipts = [{ ...receipt, status: "pending", reference: "" }];
  w.deals = [
    {
      id: "d",
      name: "Won",
      contact: "",
      stage: "won",
      value: 999,
      nextAction: "",
      due: "",
      notes: "",
    },
  ];
  assert.equal(metrics(w).collected, 0);
  assert.equal(metrics(w).pending, 199);
  assert.equal(metrics(w).pipeline, 0);
});
test("refunds, costs and fees reduce margin and currencies remain separate", () => {
  const w = emptyWorkspace();
  w.receipts = [
    { ...receipt, status: "refunded", refund: 99 },
    { ...receipt, id: "cop", currency: "COP", gross: 900000 },
  ];
  assert.equal(metrics(w).collected, 100);
  assert.equal(metrics(w).margin, 54);
  assert.equal(metrics(w, "COP").collected, 900000);
});
test("paid receipts require evidence and refunds cannot exceed gross", () => {
  const w = emptyWorkspace();
  w.receipts = [{ ...receipt, reference: "" }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.receipts = [{ ...receipt, refund: 200 }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
});
test("invalid phone, orphan products, duplicates and fractional stock are rejected", () => {
  const w = emptyWorkspace();
  const b = {
    id: "b",
    name: "Cafe",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "",
  };
  w.businesses = [b];
  w.products = [
    {
      id: "p",
      businessId: "orphan",
      name: "Coffee",
      description: "",
      price: 12,
      cost: 4,
      stock: 3,
      image: "",
    },
  ];
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.products[0].businessId = "b";
  w.products[0].stock = 1.5;
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.products = [];
  w.businesses.push(b);
  assert.equal(workspaceSchema.safeParse(w).success, false);
  w.businesses = [{ ...b, phone: "not-a-phone" }];
  assert.equal(workspaceSchema.safeParse(w).success, false);
});
test("catalog escapes supplied markup, omits costs and disables unavailable products", () => {
  const b = {
    id: "b",
    name: "<script>alert(1)</script>",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "A & B",
  };
  const html = catalogHTML(b, [
    {
      id: "p",
      businessId: "b",
      name: "<img onerror=x>",
      description: "",
      price: 12,
      cost: 4,
      stock: 0,
      image: "",
    },
  ]);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Currently unavailable"));
  assert.ok(!html.includes('data-product="p"'));
  assert.ok(!html.includes('"cost"'));
});

test("catalog cart exposes available products and composes one WhatsApp request", () => {
  const business = {
    id: "b",
    name: "Casa Verde",
    category: "Cafe",
    phone: "12125550100",
    currency: "USD" as const,
    description: "Coffee",
  };
  const html = catalogHTML(business, [
    {
      id: "p1",
      businessId: "b",
      name: "Morning box",
      description: "Coffee and pastry",
      price: 12,
      cost: 4,
      stock: 3,
      image: "",
    },
  ]);
  assert.match(html, /data-product="p1"/);
  assert.match(html, /Catalog subtotal/);
  assert.match(html, /https:\/\/wa\.me/);
  assert.ok(!html.includes('"cost":4'));
});

test("proposal exports a bounded draft without inventing agreement", () => {
  const workspace = emptyWorkspace();
  const html = proposalHTML(
    {
      id: "b",
      name: "SaborClick",
      category: "Services",
      phone: "12125550100",
      currency: "USD",
      description: "",
    },
    {
      id: "d",
      name: "Neighborhood Cafe",
      contact: "Owner",
      stage: "proposal",
      value: 199,
      nextAction: "Review scope",
      due: "",
      notes: "",
    },
    workspace.settings,
  );
  assert.match(html, /\$199\.00/);
  assert.match(html, /not an invoice or binding agreement/);
  assert.ok(!html.includes("undefined"));
});

test("close desk prioritizes overdue work and reports missing sales data", () => {
  const workspace = emptyWorkspace();
  workspace.deals = [
    {
      id: "later",
      name: "Later Cafe",
      contact: "Owner",
      stage: "contacted",
      value: 199,
      nextAction: "Review sample",
      due: "2026-10-20",
      notes: "Asked about updates",
      priority: "high",
    },
    {
      id: "overdue",
      name: "Overdue Bakery",
      contact: "",
      stage: "prospect",
      value: 199,
      nextAction: "",
      due: "2026-10-10",
      notes: "",
      priority: "low",
    },
  ];
  const queue = salesQueue(workspace, new Date("2026-10-11T12:00:00Z"));
  assert.equal(queue[0].deal.id, "overdue");
  assert.equal(queue[0].overdue, true);
  assert.deepEqual(
    dealReadiness(queue[0].deal, new Date("2026-10-11T12:00:00Z")).missing,
    ["contact", "next action"],
  );
});

test("follow-up assets are explicit, bounded and never claim automatic sending", () => {
  const workspace = emptyWorkspace();
  const deal = {
    id: "d",
    name: "Neighborhood Cafe",
    contact: "Maya",
    stage: "proposal" as const,
    value: 249,
    nextAction: "Review scope",
    due: "2026-10-15",
    notes: "",
    objection: "Needs owner approval",
  };
  const message = followUpText(deal, workspace.settings);
  const pack = outreachPack(deal, workspace.settings);
  assert.match(message, /Maya/);
  assert.match(message, /\$249\.00/);
  assert.match(pack, /No message has been sent automatically/);
  assert.match(pack, /Needs owner approval/);
});

test("proposal may expose configured seller actions without treating a link as payment", () => {
  const workspace = emptyWorkspace();
  workspace.settings.sellerPhone = "12125550100";
  workspace.settings.paymentLink = "https://pay.example/deposit";
  workspace.settings.depositPercent = 50;
  const html = proposalHTML(
    null,
    {
      id: "d",
      name: "Neighborhood Cafe",
      contact: "Owner",
      stage: "proposal",
      value: 200,
      nextAction: "Review scope",
      due: "",
      notes: "",
    },
    workspace.settings,
  );
  assert.match(html, /Proposed deposit: \$100\.00/);
  assert.match(html, /https:\/\/wa\.me\/12125550100/);
  assert.match(html, /https:\/\/pay\.example\/deposit/);
  assert.match(html, /does not confirm payment/);
  workspace.settings.paymentLink = "javascript:alert(1)";
  assert.equal(workspaceSchema.safeParse(workspace).success, false);
});
