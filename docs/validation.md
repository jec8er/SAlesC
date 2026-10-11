# Validation

- Domain tests cover pending/won separation, currency isolation, refund and cost contribution, paid-reference enforcement, duplicate/orphan validation, stock validation and escaped customer exports.
- TypeScript check: `node node_modules/typescript/bin/tsc --noEmit`.
- Production build: Sites build helper / Vinext.
- Records are owner-scoped on every read and update; write revisions are compared atomically.
- No browser QA was performed because the supported managed browser-control capability was unavailable. Visual responsiveness and real microphone/device behavior therefore require a user browser check.
- End-to-end hosted D1 writes and external WhatsApp delivery are not asserted by build tests. Deployment success verifies hosting, not a paid transaction.
