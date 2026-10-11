# Validation — standalone GitHub runtime

- Seven domain tests: unpaid opportunity separation; refund/cost/fee contribution; currency isolation; paid-reference validation; invalid record validation; safe catalog escaping; multi-product cart requests; bounded proposal exports.
- Six server integration tests with real HTTP requests: anonymous/spoofed-header rejection; login/save/read/conflicts/CSRF/origin/logout; invalid payload rejection; login throttling; SQLite persistence across restarts; production HTTPS configuration and secure cookies.
- Prettier source check, strict TypeScript check and Vite production build on Linux and Windows.
- Private data is behind server session checks. The frontend is a static React bundle; the backend requires no Sites identity or D1 binding.
- Microphone behavior and visual presentation have not been browser-tested. External WhatsApp delivery and a real paid transaction are not asserted by tests.
- The repository is not an active internet server. No new external deployment has been created.
