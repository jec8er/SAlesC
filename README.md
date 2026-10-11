# SaborClick Studio

A standalone commerce, content and revenue workspace for jec8er. Runs directly from this GitHub repository with **React + Vite, Express and SQLite**. No Sites, Cloudflare, Vinext, ChatGPT authentication or third-party database account is required.

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

## Features

- Owner-password sign-in with server sessions, HttpOnly cookies, expiry, login throttling and CSRF checks.
- Durable SQLite records with atomic revision checks: conflicting edits cannot silently overwrite one another.
- Business/product management and standalone customer catalog exports with a responsive cart, real prices and one complete WhatsApp request to the business number.
- Bilingual launch-script templates and local microphone recording/downloads.
- Opportunity tracking with next actions, follow-up dates and downloadable draft proposals tied to the selected business.
- Manual revenue ledger separating proposals, pending payments and documented collections. Costs, fees and refunds reduce contribution margin. USD/COP totals never mix.
- Validated JSON backups and a separate illustrative demo that does not write real records.

Customer catalogs contain approved public product facts only, not cost data or prospect records. Requests are not automatically paid, fulfilled or confirmed orders. Scripts and recordings stay in the browser tab until downloaded.

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
- Keep `DATABASE_PATH` on a persistent volume and maintain backups. Use one application replica per SQLite database. JSON backup exports are available from Settings.
- The Dockerfile builds the frontend and runs the backend as the non-root `node` user. Mount a writable `/app/data` volume and provide secrets through the environment.

## Revenue approach

The offer to test is a defined catalog/content setup service: proposed USD 199 setup and USD 39/month for agreed updates. These remain unvalidated hypotheses, not paid customers, subscriptions or predicted revenue. No autonomous outreach, AI generation, payment processing or social publishing is connected. A real sale requires a buyer, agreed scope, fulfilled delivery and a documented collection.

## Project structure

- `src/`: React workspace and independent sign-in screen.
- `server/`: Express API, sessions, password hashing and SQLite persistence.
- `lib/domain.ts`: validation, contribution calculations and customer exports.
- `tests/`: domain and HTTP/database integration tests.
- `legacy/`: unchanged original SaborClick/Express sources, preserved for history.

Existing JSON exports from the earlier workspace can be restored in Settings after signing in. The previous hosted database is not automatically migrated or accessed.
