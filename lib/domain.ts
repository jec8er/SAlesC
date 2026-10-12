import { z } from "zod";
const text = z.string().trim().min(1).max(180);
const money = z.number().finite().min(0).max(100000000);
export const businessSchema = z
  .object({
    id: text,
    name: text,
    category: text,
    phone: z
      .string()
      .regex(/^\d{8,15}$/, "Use 8–15 digits, including country code"),
    currency: z.enum(["USD", "COP"]),
    description: z.string().max(600),
  })
  .strict();
export const productSchema = z
  .object({
    id: text,
    businessId: text,
    name: text,
    description: z.string().max(600),
    price: money,
    cost: money,
    stock: z.number().int().min(0).max(100000),
    image: z
      .string()
      .max(2000)
      .refine((v) => !v || /^https:\/\//.test(v), "Use an HTTPS image URL"),
  })
  .strict();
export const dealSchema = z
  .object({
    id: text,
    name: text,
    contact: z.string().max(180),
    stage: z.enum(["prospect", "contacted", "proposal", "won", "lost"]),
    value: money,
    nextAction: z.string().max(400),
    due: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(1000),
    source: z
      .enum([
        "referral",
        "walk-in",
        "social",
        "marketplace",
        "outbound",
        "other",
      ])
      .optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    lastContact: z
      .string()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    objection: z.string().max(400).optional(),
    businessId: z.string().max(180).optional(),
  })
  .strict();
export const receiptSchema = z
  .object({
    id: text,
    label: text,
    kind: z.enum(["service", "product"]),
    currency: z.enum(["USD", "COP"]),
    gross: money,
    cost: money,
    fees: money,
    refund: money,
    status: z.enum(["pending", "paid", "refunded"]),
    reference: z.string().max(180),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dealId: z.string().max(180).optional(),
  })
  .strict()
  .superRefine((r, c) => {
    if (r.status !== "pending" && !r.reference.trim())
      c.addIssue({
        code: "custom",
        message: "A payment reference is required",
        path: ["reference"],
      });
    if (r.refund > r.gross)
      c.addIssue({
        code: "custom",
        message: "Refund cannot exceed gross",
        path: ["refund"],
      });
    if (r.status === "refunded" && r.refund === 0)
      c.addIssue({
        code: "custom",
        message: "Enter the refunded amount",
        path: ["refund"],
      });
    if (r.status === "pending" && r.refund)
      c.addIssue({
        code: "custom",
        message: "Pending payments cannot have refunds",
        path: ["refund"],
      });
  });
export const workspaceSchema = z
  .object({
    businesses: z.array(businessSchema).max(100),
    products: z.array(productSchema).max(1000),
    deals: z.array(dealSchema).max(1000),
    receipts: z.array(receiptSchema).max(1000),
    settings: z
      .object({
        setupPrice: money,
        monthlyPrice: money,
        target: money,
        currency: z.enum(["USD", "COP"]),
        sellerName: z.string().trim().max(180).optional(),
        sellerPhone: z
          .string()
          .regex(/^$|^\d{8,15}$/, "Use 8–15 digits, including country code")
          .optional(),
        sellerEmail: z
          .string()
          .trim()
          .max(254)
          .refine(
            (value) => !value || z.string().email().safeParse(value).success,
            "Use a valid email address",
          )
          .optional(),
        paymentLink: z
          .string()
          .trim()
          .max(2000)
          .refine(
            (value) => !value || /^https:\/\//.test(value),
            "Use an HTTPS payment link",
          )
          .optional(),
        offerName: z.string().trim().max(180).optional(),
        offerPromise: z.string().trim().max(400).optional(),
        depositPercent: z.number().int().min(0).max(100).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((w, c) => {
    for (const key of [
      "businesses",
      "products",
      "deals",
      "receipts",
    ] as const) {
      const ids = w[key].map((x) => x.id);
      if (new Set(ids).size !== ids.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate identifiers",
          path: [key],
        });
    }
    const ids = new Set(w.businesses.map((x) => x.id));
    if (w.products.some((p) => !ids.has(p.businessId)))
      c.addIssue({
        code: "custom",
        message: "A product must belong to a business",
        path: ["products"],
      });
    if (w.deals.some((deal) => deal.businessId && !ids.has(deal.businessId)))
      c.addIssue({
        code: "custom",
        message: "An opportunity must reference an existing business",
        path: ["deals"],
      });
    const dealIds = new Set(w.deals.map((deal) => deal.id));
    if (
      w.receipts.some(
        (receipt) => receipt.dealId && !dealIds.has(receipt.dealId),
      )
    )
      c.addIssue({
        code: "custom",
        message: "A payment must reference an existing opportunity",
        path: ["receipts"],
      });
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export type Business = z.infer<typeof businessSchema>;
export type Product = z.infer<typeof productSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export const emptyWorkspace = (): Workspace => ({
  businesses: [],
  products: [],
  deals: [],
  receipts: [],
  settings: {
    setupPrice: 199,
    monthlyPrice: 39,
    target: 1000,
    currency: "USD",
    sellerName: "ORBIT",
    sellerPhone: "",
    sellerEmail: "",
    paymentLink: "",
    offerName: "Direct Commerce Launch",
    offerPromise:
      "A clear direct-order catalog, launch content and an owner handoff.",
    depositPercent: 50,
  },
});
export function metrics(w: Workspace, currency = w.settings.currency) {
  const paid = w.receipts.filter(
    (r) => r.status !== "pending" && r.currency === currency,
  );
  const sum = (f: (r: (typeof paid)[number]) => number) =>
    paid.reduce((a, r) => a + f(r), 0);
  return {
    collected: sum((r) => r.gross - r.refund),
    margin: sum((r) => r.gross - r.refund - r.cost - r.fees),
    pending: w.receipts
      .filter((r) => r.status === "pending" && r.currency === currency)
      .reduce((a, r) => a + r.gross, 0),
    pipeline: w.deals
      .filter((d) => !["won", "lost"].includes(d.stage))
      .reduce((a, d) => a + d.value, 0),
    count: paid.length,
  };
}
export function moneyLabel(n: number, currency = "USD") {
  return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(n);
}

export function dealReadiness(deal: Deal, today = new Date()) {
  if (deal.stage === "won")
    return { score: 100, overdue: false, missing: [] as string[] };
  if (deal.stage === "lost")
    return { score: 0, overdue: false, missing: [] as string[] };
  const missing: string[] = [];
  let score = { prospect: 10, contacted: 25, proposal: 45 }[deal.stage];
  if (deal.contact.trim()) score += 15;
  else missing.push("contact");
  if (deal.nextAction.trim()) score += 20;
  else missing.push("next action");
  if (deal.due) score += 10;
  else missing.push("follow-up date");
  if (deal.notes.trim()) score += 5;
  if (deal.lastContact) score += 5;
  if (deal.objection?.trim()) score += 5;
  const day = today.toISOString().slice(0, 10);
  return {
    score: Math.min(100, score),
    overdue: Boolean(deal.due && deal.due < day),
    missing,
  };
}

export function salesQueue(workspace: Workspace, today = new Date()) {
  const day = today.toISOString().slice(0, 10);
  const priority = { high: 0, medium: 1, low: 2 } as const;
  return workspace.deals
    .filter((deal) => !["won", "lost"].includes(deal.stage))
    .map((deal) => ({ deal, ...dealReadiness(deal, today) }))
    .sort((a, b) => {
      const dueA = a.deal.due || "9999-12-31";
      const dueB = b.deal.due || "9999-12-31";
      return (
        Number(dueA >= day) - Number(dueB >= day) ||
        dueA.localeCompare(dueB) ||
        priority[a.deal.priority || "medium"] -
          priority[b.deal.priority || "medium"] ||
        b.score - a.score
      );
    });
}

export function followUpText(deal: Deal, settings: Workspace["settings"]) {
  const seller = settings.sellerName || "ORBIT";
  const offer = settings.offerName || "Direct Commerce Launch";
  const promise =
    settings.offerPromise ||
    "a clear direct-order catalog, launch content and an owner handoff";
  const greeting = deal.contact.trim() || deal.name;
  if (deal.stage === "proposal")
    return `Hi ${greeting} — this is ${seller}. I wanted to follow up on the ${offer} proposal. The proposed scope is ${promise.toLowerCase()} for ${moneyLabel(deal.value || settings.setupPrice, settings.currency)}. Would you like to review the scope together or decide on the next step?`;
  if (deal.stage === "contacted")
    return `Hi ${greeting} — thank you for the conversation. Based on what we discussed, ${offer} is designed to deliver ${promise.toLowerCase()}. The next useful step is ${deal.nextAction || "a short scope review"}. What time works for you?`;
  return `Hi ${greeting} — I’m ${seller}. I help independent businesses with ${promise.toLowerCase()} through ${offer}. I’d like to understand how customers order from ${deal.name} today and whether a simpler direct-order flow would be useful. Would you be open to a short conversation?`;
}

export function outreachPack(deal: Deal, settings: Workspace["settings"]) {
  const first = followUpText(deal, settings);
  const seller = settings.sellerName || "ORBIT";
  return `SALES FOLLOW-UP PACK — ${deal.name}\n\n1. CURRENT MESSAGE\n${first}\n\n2. VALUE FOLLOW-UP (2 BUSINESS DAYS LATER)\nHi ${deal.contact || deal.name} — following up from ${seller}. The goal is not to add more software; it is to make the offer, ordering path and handoff clearer. Is this still worth reviewing?\n\n3. CLOSE THE LOOP (5 BUSINESS DAYS LATER)\nHi ${deal.contact || deal.name} — I’m closing the loop on this for now. If improving the direct-order experience becomes a priority, reply here and I’ll reopen the scope.\n\nInternal next action: ${deal.nextAction || "Choose a specific next action before sending."}\n${deal.objection ? `Known objection: ${deal.objection}\n` : ""}No message has been sent automatically.`;
}

export function orbitReadiness(workspace: Workspace, deal: Deal) {
  const business = workspace.businesses.find(
    (item) => item.id === deal.businessId,
  );
  const products = business
    ? workspace.products.filter((item) => item.businessId === business.id)
    : [];
  const collected = workspace.receipts
    .filter(
      (receipt) =>
        receipt.dealId === deal.id &&
        receipt.status === "paid" &&
        receipt.currency === workspace.settings.currency,
    )
    .reduce((total, receipt) => total + receipt.gross - receipt.refund, 0);
  const blockers: string[] = [];
  if (deal.stage !== "won") blockers.push("mark the opportunity won");
  if (!business) blockers.push("link a business");
  if (!products.length) blockers.push("add at least one real product");
  if (!deal.contact.trim()) blockers.push("record the client contact");
  if (!deal.notes.trim()) blockers.push("record approved scope notes");
  if (collected <= 0) blockers.push("verify a deposit or payment");
  return {
    business,
    products,
    collected,
    blockers,
    ready: blockers.length === 0,
    score: Math.round(((6 - blockers.length) / 6) * 100),
  };
}

export function orbitHandoff(workspace: Workspace, deal: Deal) {
  const { business, products, blockers, ready } = orbitReadiness(
    workspace,
    deal,
  );
  const lines = products.map(
    (product) =>
      `- ${product.name}: ${moneyLabel(product.price, business?.currency)}; stock ${product.stock}; ${product.description || "description pending"}`,
  );
  return `ORBIT DELIVERY HANDOFF — ${deal.name}

STATUS
${ready ? "Ready for controlled production" : `Blocked: ${blockers.join("; ")}`}

COMMERCIAL CONTEXT
Offer: ${workspace.settings.offerName || "Direct Commerce Launch"}
Agreed opportunity value: ${moneyLabel(deal.value, workspace.settings.currency)}
Client contact: ${deal.contact || "Not recorded"}
Linked business: ${business?.name || "Not linked"}
Approved scope notes: ${deal.notes || "Not recorded"}

BUSINESS FACTS
${business ? `${business.name} · ${business.category}\n${business.description}\nWhatsApp: +${business.phone}` : "Business details pending"}

PRODUCT FACTS
${lines.length ? lines.join("\n") : "No products recorded"}

ORBIT PRODUCTION GATES
1. Use only the approved facts above; do not invent claims, prices or availability.
2. Produce the catalog and launch assets for human review.
3. Verify mobile layout, links, WhatsApp destination and current inventory.
4. Obtain explicit owner approval before publication or delivery.
5. Keep the verified deposit or payment reference linked to this opportunity.

Nothing in this handoff publishes, messages a customer or charges a payment automatically.`;
}
export function escapeHTML(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function scriptFor(b: Business, p: Product, language: string) {
  return language === "es"
    ? `¿Buscas ${p.name.toLowerCase()}? En ${b.name} puedes pedir directamente. ${p.description || b.description} Precio: ${moneyLabel(p.price, b.currency)}. Escríbenos por WhatsApp para confirmar disponibilidad y coordinar entrega o recogida. ${b.name}: tu próximo pedido empieza aquí.`
    : `Looking for ${p.name.toLowerCase()}? Order directly from ${b.name}. ${p.description || b.description} Priced at ${moneyLabel(p.price, b.currency)}. Message us on WhatsApp to confirm availability and arrange pickup or delivery. ${b.name}: your next order starts here.`;
}
export function catalogHTML(b: Business, products: Product[]) {
  const safe = (s: string) => escapeHTML(s);
  const available = products.filter((product) => product.stock > 0);
  const publicProducts = available.map(({ id, name, price, stock }) => ({
    id,
    name,
    price,
    stock,
  }));
  const productData = JSON.stringify(publicProducts).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Order directly from ${safe(b.name)}">
  <title>${safe(b.name)} · Direct orders</title>
  <style>
    :root{--paper:#f5f3eb;--ink:#173b35;--muted:#66776f;--line:#dde2da;--accent:#d8e89e}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 system-ui,-apple-system,sans-serif}
    header,main,footer{max-width:1120px;margin:auto;padding:48px 24px}header{padding-bottom:28px}.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:700;color:#718064}
    h1{font:clamp(42px,8vw,82px)/.95 Georgia,serif;letter-spacing:-.04em;margin:22px 0}header p{max-width:650px;color:var(--muted)}
    main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;padding-top:10px;padding-bottom:180px}
    article{background:white;border:1px solid var(--line);padding:18px;border-radius:18px;display:flex;flex-direction:column;min-height:320px}
    img,.placeholder{width:100%;height:180px;object-fit:cover;border-radius:12px;background:#e8ecdf}.placeholder{display:grid;place-items:center;font:34px Georgia;color:#839471}
    h2{font:25px Georgia,serif;margin:20px 0 8px}article p{color:var(--muted);font-size:14px;flex:1}h3{font:26px Georgia;margin:12px 0}
    button{border:0;border-radius:9px;padding:13px 16px;font:700 13px system-ui;cursor:pointer}.add{background:var(--ink);color:white}.add:disabled{background:#dfe3dc;color:#8c968e;cursor:not-allowed}
    .sold{font-size:12px;color:#8d514a;font-weight:700}.cart{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);width:min(920px,calc(100% - 28px));background:#173b35;color:white;border-radius:18px;padding:18px 20px;box-shadow:0 20px 60px #173b3540;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center}
    .cart strong{font:23px Georgia}.cart small{display:block;color:#c5d0c9;margin-top:4px}.cart button{background:var(--accent);color:var(--ink);min-width:190px}.cart button:disabled{opacity:.45;cursor:not-allowed}
    footer{color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-bottom:130px}@media(max-width:620px){header{padding-top:30px}.cart{grid-template-columns:1fr}.cart button{width:100%}main{padding-bottom:230px}}
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">DIRECT FROM THE BUSINESS</div>
    <h1>${safe(b.name)}</h1>
    <p>${safe(b.description)}</p>
    <p>${safe(b.category)} · Prices in ${b.currency}</p>
  </header>
  <main>
    ${products
      .map(
        (p) => `<article>
      ${p.image ? `<img src="${safe(p.image)}" alt="${safe(p.name)}" loading="lazy">` : `<div class="placeholder" aria-hidden="true">${safe(p.name.slice(0, 1).toUpperCase())}</div>`}
      <h2>${safe(p.name)}</h2>
      <p>${safe(p.description)}</p>
      <h3>${moneyLabel(p.price, b.currency)}</h3>
      ${p.stock > 0 ? `<button class="add" data-product="${safe(p.id)}">Add to request</button>` : `<span class="sold">Currently unavailable</span>`}
    </article>`,
      )
      .join("")}
  </main>
  <footer>Prices exclude delivery unless confirmed by the business. Sending the request does not create a paid or confirmed order. No payment details are collected here.</footer>
  <aside class="cart" aria-live="polite">
    <div><strong id="cart-total">${moneyLabel(0, b.currency)}</strong><small id="cart-summary">Your request is empty</small></div>
    <button id="send" disabled>Request on WhatsApp ↗</button>
  </aside>
  <script type="application/json" id="catalog-data">${productData}</script>
  <script>
    (() => {
      const products = JSON.parse(document.getElementById('catalog-data').textContent);
      const quantities = new Map();
      const currency = ${JSON.stringify(b.currency)};
      const business = ${JSON.stringify(b.name).replace(/</g, "\\u003c")};
      const phone = ${JSON.stringify(b.phone)};
      const money = new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {style:'currency',currency,maximumFractionDigits:currency === 'COP' ? 0 : 2});
      const total = document.getElementById('cart-total');
      const summary = document.getElementById('cart-summary');
      const send = document.getElementById('send');
      function render(){
        const selected = products.filter(product => (quantities.get(product.id) || 0) > 0);
        const count = selected.reduce((sum,product) => sum + quantities.get(product.id), 0);
        const amount = selected.reduce((sum,product) => sum + product.price * quantities.get(product.id), 0);
        total.textContent = money.format(amount);
        summary.textContent = count ? count + (count === 1 ? ' item in request' : ' items in request') : 'Your request is empty';
        send.disabled = count === 0;
        document.querySelectorAll('[data-product]').forEach(button => {
          const quantity = quantities.get(button.dataset.product) || 0;
          button.textContent = quantity ? 'Add another · ' + quantity + ' selected' : 'Add to request';
        });
      }
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-product]');
        if (!button) return;
        const product = products.find(item => item.id === button.dataset.product);
        const next = Math.min((quantities.get(product.id) || 0) + 1, product.stock);
        quantities.set(product.id, next);
        render();
      });
      send.addEventListener('click', () => {
        const lines = products.filter(product => quantities.get(product.id)).map(product => {
          const quantity = quantities.get(product.id);
          return '• ' + quantity + ' × ' + product.name + ' — ' + money.format(product.price * quantity);
        });
        const amount = products.reduce((sum,product) => sum + product.price * (quantities.get(product.id) || 0), 0);
        const message = ['Hello ' + business + ', I would like to request:', '', ...lines, '', 'Catalog subtotal: ' + money.format(amount), 'Please confirm availability, pickup or delivery, and the final total.'].join('\\n');
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
      });
      render();
    })();
  </script>
</body>
</html>`;
}

export function proposalHTML(
  b: Business | null,
  deal: Deal,
  settings: Workspace["settings"],
) {
  const safe = (value: string) => escapeHTML(value);
  const today = new Date().toISOString().slice(0, 10);
  const price = moneyLabel(
    deal.value || settings.setupPrice,
    settings.currency,
  );
  const seller = settings.sellerName || b?.name || "ORBIT";
  const offer = settings.offerName || "Direct Commerce Launch";
  const promise =
    settings.offerPromise ||
    "A clear direct-order catalog, launch content and an owner handoff.";
  const percent = settings.depositPercent ?? 50;
  const deposit = moneyLabel(
    ((deal.value || settings.setupPrice) * percent) / 100,
    settings.currency,
  );
  const phone = settings.sellerPhone || "";
  const paymentLink = /^https:\/\//.test(settings.paymentLink || "")
    ? settings.paymentLink || ""
    : "";
  const message = encodeURIComponent(
    `Hello ${seller}, I would like to discuss the ${offer} proposal for ${deal.name}.`,
  );
  const contact = [
    phone
      ? `<a class="cta" href="https://wa.me/${safe(phone)}?text=${message}">Discuss on WhatsApp</a>`
      : "",
    paymentLink
      ? `<a class="cta secondary" href="${safe(paymentLink)}" target="_blank" rel="noopener noreferrer">Open secure deposit link</a>`
      : "",
    settings.sellerEmail
      ? `<a class="cta secondary" href="mailto:${safe(settings.sellerEmail)}?subject=${encodeURIComponent(`${offer} proposal`)}">Reply by email</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Proposal · ${safe(deal.name)}</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f2ea;color:#173b35;font:15px/1.65 system-ui}main{max-width:900px;margin:40px auto;background:white;padding:clamp(30px,7vw,80px);box-shadow:0 20px 70px #173b3514}.label{font-size:10px;letter-spacing:.18em;font-weight:700;color:#7d8e6c}h1{font:clamp(42px,7vw,72px)/1 Georgia;margin:30px 0}h2{font:28px Georgia;margin-top:48px}.intro{font-size:19px;color:#63736b}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:40px 0}.box{background:#edf1e4;padding:24px;border-radius:12px}.price{font:42px Georgia;margin:0}.scope li{margin:12px 0}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:38px 0}.cta{display:inline-block;background:#173b35;color:white;text-decoration:none;padding:14px 18px;border-radius:9px;font-weight:700}.cta.secondary{background:#d8e89e;color:#173b35}.terms{border-top:1px solid #dce2d9;margin-top:50px;padding-top:25px;color:#6e7a74;font-size:12px}@media(max-width:620px){.grid{grid-template-columns:1fr}}@media print{body{background:white}main{margin:0;box-shadow:none}.actions{display:none}}</style></head><body><main><div class="label">DRAFT SERVICE PROPOSAL · ${today}</div><h1>${safe(offer)}</h1><p class="intro">Prepared for <strong>${safe(deal.name)}</strong>${deal.contact ? ` · ${safe(deal.contact)}` : ""} by ${safe(seller)}.</p><p class="intro">${safe(promise)}</p><div class="grid"><div class="box"><div class="label">PROPOSED INVESTMENT</div><p class="price">${price}</p><p>Proposed deposit: ${deposit} (${percent}%). Subject to written approval.</p></div><div class="box"><div class="label">NEXT STEP</div><p>${safe(deal.nextAction || "Confirm scope, timeline and payment terms")}</p>${deal.due ? `<p>Target follow-up: ${safe(deal.due)}</p>` : ""}</div></div>${contact ? `<div class="actions">${contact}</div>` : ""}<h2>Proposed scope</h2><ul class="scope"><li>One direct-order catalog using approved business and product information.</li><li>Up to ten products with current prices and availability.</li><li>A WhatsApp request flow tested with the business owner.</li><li>Three editable launch scripts and one recorded voiceover file.</li><li>One handoff session and one revision round.</li></ul><h2>Success criteria</h2><p>The catalog opens correctly on mobile and desktop, sends a complete order request to the approved business number, and can be updated from the delivered workspace.</p><div class="terms">Draft generated from ORBIT. This document is not an invoice or binding agreement. Opening a payment link does not confirm payment. Final scope, delivery date, taxes, payment method, ownership and revision limits must be confirmed in writing before work begins.</div></main></body></html>`;
}
