# ORBIT repository instructions

Work from the latest `main` and inspect open pull requests before changing code.
ORBIT is one independent product, not separate SaborClick, Ecomoda, or Sites apps.

## Product priorities

1. Optimize for documented collections and reliable customer delivery.
2. Preserve the flow: opportunity → proposal → verified payment → ORBIT delivery → handoff.
3. Prefer reducing operator steps over adding dashboards or speculative AI features.
4. Treat pipeline value, pending payments, and collected revenue as different facts.
5. Never claim a message was sent, content was published, a payment was verified, or revenue was earned unless the application stores appropriate evidence.

## Architecture and safety

- Runtime: Node 24+, React/Vite frontend, Express API, SQLite workspace data.
- Keep private records behind the existing owner session and CSRF controls.
- Maintain backward compatibility: new persisted fields should normally be optional.
- Validate all persisted workspace changes in `lib/domain.ts` with strict Zod schemas.
- Keep external customer exports bounded, escaped, and free of internal costs or prospect data.
- Do not add Sites, Cloudflare, a third-party database, paid inference, automatic outreach, automatic publishing, or payment-processing dependencies without an explicit product decision.
- ORBIT project memory remains curated and revision-safe; generated content is not technical validation.
- Do not edit `legacy/` unless a task explicitly targets historical files.

## Change discipline

- Update or add deterministic tests for every business-rule change.
- Run `npm run format:check`, `npm run typecheck`, `npm test`, and `npm run build`.
- Keep PRs focused and explain the revenue/customer outcome, data migration impact, and validation performed.
- If another branch changed the same workflow, reconcile behavior and tests rather than overwriting it.
