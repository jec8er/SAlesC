# ORBIT

A standalone agentic market laboratory for jec8er. ORBIT coordinates research, strategy, risk, compliance, paper execution and audit in one private workspace. Its native intelligence engine reasons from stored evidence without OpenAI, an external model API or a cloud inference dependency. It runs directly from this GitHub repository with **React + Vite, Express and SQLite**.

## Start locally (Windows, macOS or Linux)

Install Node.js 24 or newer, then open a terminal in this repository:

```sh
npm ci --ignore-scripts
npm run setup
npm run build
npm start
```

`setup` asks for your owner password with hidden input and creates an ignored `.env` file containing its salted hash. There is no default password. Open **http://127.0.0.1:3001**, then sign in. The server binds only to your own computer by default.

For frontend development, after setup use `npm run dev`. Open the Vite URL printed in the terminal; it proxies `/api` to the Express server. Both processes stop together.

Static Netlify and Vercel deployments are design previews only. Deep links such as `/pricing` route to the React application, while Netlify returns an explicit unavailable response for `/api/*`. The complete authenticated workspace requires the independent Express server and persistent SQLite storage described below.

## Features

- Owner-password sign-in with server sessions, HttpOnly cookies, expiry, login throttling and CSRF checks.
- Durable SQLite records with atomic revision checks: conflicting edits cannot silently overwrite one another.
- A six-agent command center: Scout, Strategist, Risk, Compliance, Executor and Auditor.
- ORBIT Intelligence V1: a local, deterministic multi-agent council that independently scores evidence, strategy quality, risk, compliance, execution history and audit consistency.
- Agent Operations V2: a mission board that preserves the ordered Scout → Strategist → Risk → Compliance → Executor → Auditor handoff, exposes each output and evidence reference, and withholds the owner gate when audit findings remain.
- Local browser voice briefings for mission summaries. Audio uses the device speech engine; no mission data is sent to an AI or speech provider by ORBIT.
- Explainable recommendations with an overall score, evidence confidence, agent consensus, explicit blockers and evidence references.
- Owner acceptance/rejection stored as adaptive memory; ORBIT incorporates prior decisions into later audit scores while preserving human authority.
- Strategy creation with explicit thesis, confidence, entry, invalidation, target and bounded risk.
- Independent policy gates requiring minimum confidence, reward-to-risk and loss-budget compliance.
- Position sizing constrained by both risk-at-stop and maximum modeled notional.
- A paper-only scenario engine and auditable ledger with realized/unrealized P&L, open risk and JSON export.
- Browser-side historical backtesting from chronological OHLCV CSV files, with next-bar execution, configurable SMA windows and per-side fees.
- Comparable backtest evidence: net return, buy-and-hold return, maximum drawdown, win rate, trade count and profit factor. Only summaries and a SHA-256 dataset fingerprint are stored; raw datasets remain local.
- Owner-controlled portfolio limits. Live execution is hard-locked; no exchange keys, wallets or live order routes are present.
- Mission acceptance records the owner decision only. It never creates a paper trade or triggers an execution action automatically.
- A 20-control Trust Center that separates repository-verified safeguards from owner actions and professional review. Public launch remains blocked while required work is outstanding.
- Restrictive browser headers, keyboard navigation improvements, a skip link and explicit accessibility/legal review gates.
- An explicit subscription hypothesis with Observer, Operator and Desk tiers for commercial validation.
- A public `/pricing` beta page with Stripe-hosted subscription Checkout, signature-verified and idempotent webhooks, and an owner-only verified MRR/ARR summary. Billing remains disabled until every Stripe variable is configured.

The earlier commerce records remain schema-compatible so an existing SQLite workspace can upgrade without destructive migration. Their legacy domain utilities remain tested, but the product interface is now exclusively ORBIT.

### Safety boundary

ORBIT is currently a decision-support and simulation product. Its native intelligence is an explainable scoring and policy engine, not a language model and not artificial general intelligence. Scenario results are deterministic modeled outcomes. Historical backtests use user-supplied data and are not predictions, live prices or investment returns; the current engine does not model slippage, spread, liquidity or taxes. ORBIT does not provide investment advice, custody assets or execute trades.

The Trust Center is an evidence inventory, not a certification or legal opinion. “Verified” means a safeguard is visible in this repository. Privacy, terms, refunds, accessibility, age handling and launch claims still require the named owner or professional review before public commercialization.

## Tests and CI

```sh
npm test
npm run format:check
npm run build
```

Tests exercise real Express HTTP endpoints and SQLite persistence: login, protected records, save/reload, conflicting revisions, invalid JSON and records, CSRF, origin checks, logout, login throttling and restart persistence. Domain tests cover revenue math plus safe catalog and proposal exports. GitHub Actions checks formatting, tests and production builds on Linux and Windows, then packages the independent app as a downloadable artifact.

## Production server

GitHub stores and validates the code; it does not run a persistent Express server or SQLite database. No new hosting service is provisioned by this change.

For deployment on a server you control:

- Configure `OWNER_PASSWORD_HASH` with `npm run password:hash`; never commit the password or hash.
- Set `NODE_ENV=production` and `PUBLIC_ORIGIN` to the exact HTTPS origin, with no trailing slash.
- Terminate HTTPS at your reverse proxy. Set `HOST=0.0.0.0` only where needed, with network access restricted to your proxy.
- Keep `DATABASE_PATH` on a persistent volume and maintain backups. Use one application replica per SQLite database. Paper-trade and agent-event audit exports are available from the ledger.
- The Dockerfile builds the frontend and runs the backend as the non-root `node` user. Mount a writable `/app/data` volume and provide secrets through the environment.

## Revenue approach

The first offer to validate is **ORBIT Operator at USD 99/month**: unlimited strategy hypotheses, the full bounded agent workflow, owner-defined risk controls, audit exports and alerts. Observer (USD 29/month) can serve self-directed users; Desk (USD 299/month) is the team workflow. These prices are hypotheses, not current revenue. The product should prove retention and willingness to pay in paper mode before adding paid data feeds or any broker integration.

The paid beta uses Stripe Billing with hosted Checkout. Create a separate Stripe sandbox, one Product and recurring Price per plan, then configure the variables documented in `.env.example`. Use a least-privilege restricted key and configure the webhook endpoint at `/api/billing/webhook`; never commit keys. Subscription access is derived from verified webhook events, not the browser success page. Stripe Tax is intentionally not enabled until the business has confirmed its registrations and tax obligations.

## Project structure

- `src/`: React workspace and independent sign-in screen.
- `server/`: Express API, sessions, password hashing and SQLite persistence.
- `lib/domain.ts`: validation, risk sizing, paper performance calculations and preserved customer exports.
- `lib/trust.ts`: the evidence-backed 20-control launch gate and readiness summary.
- `tests/`: domain and HTTP/database integration tests.
- `legacy/`: unchanged original prototype sources, preserved for history.

Existing JSON exports from the earlier workspace can be restored in Settings after signing in. The previous hosted database is not automatically migrated or accessed.
