# ORBIT repository instructions

Work from the latest `main` and inspect open pull requests before changing code.
ORBIT is one independent agentic market laboratory, not separate SaborClick,
Ecomoda, trading, or Sites apps.

## Product priorities

1. Preserve the flow: observation → thesis → risk review → compliance gate → paper execution → audit.
2. Keep human authority explicit. Agents propose; bounded policy gates authorize paper actions.
3. Optimize for disciplined decisions and an evidence trail, not trading frequency.
4. Treat modeled P&L, live prices, backtest results, brokerage balances, and real returns as different facts.
5. Never claim an order was sent, a market was observed live, a backtest was run, or money was earned unless the application stores appropriate evidence.
6. Validate the subscription hypothesis in paper mode before adding paid data or broker integrations.
7. ORBIT owns its intelligence layer. Do not add OpenAI, another hosted model provider, prompt-only agent theater or opaque external recommendations.

## Architecture and safety

- Runtime: Node 24+, React/Vite frontend, Express API, SQLite workspace data.
- Keep private records behind the existing owner session and CSRF controls.
- Maintain backward compatibility: new persisted fields should normally be optional.
- Validate all persisted workspace changes in `lib/domain.ts` with strict Zod schemas.
- Live execution must remain hard-locked. Do not add wallets, exchange credentials, custody, or order routes without an explicit security and product decision.
- Strategy sizing must remain constrained by risk-at-stop and maximum modeled notional.
- Scenario results must be labeled as modeled data, never predictions or investment advice.
- Backtests must avoid look-ahead execution, include fees, disclose omitted market frictions, validate chronological OHLCV input and store summaries rather than raw datasets.
- Native council decisions must be deterministic, evidence-referenced, independently scored by all six agents and subject to explicit owner acceptance or rejection.
- Keep external customer exports bounded, escaped, and free of internal costs or prospect data.
- Do not add Sites, Cloudflare, a third-party database, paid inference, paid market data, automatic outreach, automatic publishing, payment processing, or brokerage dependencies without an explicit product decision.
- ORBIT project memory remains curated and revision-safe; generated content is not technical validation.
- Treat Trust Center statuses as evidence labels, not certifications. Never claim legal compliance, lawsuit prevention, accessibility conformance or regulatory approval from a checklist alone.
- Keep public launch blocked while a Trust Center item requires owner action or professional review. Do not invent legal policies, business details, consent records or audit results.
- Do not edit `legacy/` unless a task explicitly targets historical files.

## Change discipline

- Update or add deterministic tests for every business-rule change.
- Run `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- Keep PRs focused and explain the revenue/customer outcome, data migration impact, and validation performed.
- If another branch changed the same workflow, reconcile behavior and tests rather than overwriting it.
