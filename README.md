# SaborClick Studio

One private full-stack operating workspace consolidating jec8er's SaborClick concept, Express service foundation and previously empty SoundForge repository.

## What works

- ChatGPT sign-in with server-side user isolation.
- Cloudflare D1 cloud records with optimistic concurrency to prevent overwriting another tab.
- Business and product catalog CRUD; USD/COP kept separate; image URL and phone validation.
- Exportable standalone HTML customer catalogs. WhatsApp requests go to the business number, with price, availability and fulfillment confirmation. No customer payment is implied by a request.
- Sales opportunities, next actions, stages and follow-up dates.
- Manual collection ledger with receipt references, delivery/labor costs, fees and refunds. Pending payments and won opportunities never count as collected revenue.
- SoundForge template-assisted English/Spanish scripts and browser microphone recording. Download audio before closing the tab.
- Validated JSON export/restore. Isolated demo mode never writes real records.

## Commercial approach

Sell a defined catalog-and-content setup service first. Default test prices are **USD 199 setup** and **USD 39/month for agreed updates**. These are unvalidated offer hypotheses, not market pricing, customers, active subscriptions or predicted income. A paid service needs agreed scope, delivery and a real collection method.

The private workspace is not publicly accessible to buyers. Exported customer catalogs can be delivered separately or hosted after explicit audience selection. Payment processing, AI generation, social publishing and autonomous prospecting are not connected. No sales or revenue have occurred as a result of this build.

## Development

Node 22.13+; use the pinned package manager and lockfile.

```sh
npm run dev
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/domain.test.ts
npm run build
```

Hosting uses Sites with the DB D1 binding. Apply committed Drizzle migrations through the supported deployment flow. Standalone deployment must provide trusted authentication headers via an authenticated ingress; do not expose the Worker directly with user-controlled identity headers. Runtime secrets and customer data must never be committed.

## Consolidation

`app/` is the unified interface and authenticated API. `lib/domain.ts` is the shared validation, revenue and export logic. `db/` and `drizzle/` define durable storage. `legacy/` preserves the original SaborClick HTML and Express sources for provenance, not production use. SoundForge had no source files to migrate.

See [commercial strategy](docs/commercial-strategy.md) and [validation](docs/validation.md).
