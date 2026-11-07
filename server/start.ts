import { createApplication } from "./app.ts";
import { createStripeBillingGateway } from "./billing.ts";
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const localPasswordless = process.env.ORBIT_LOCAL_PASSWORDLESS === "true";
if (localPasswordless && !["127.0.0.1", "::1"].includes(host))
  throw Error("Password-free access requires a loopback HOST");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("Invalid PORT");
const stripeValues = [
  process.env.STRIPE_RESTRICTED_KEY,
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.STRIPE_PRICE_OBSERVER,
  process.env.STRIPE_PRICE_OPERATOR,
  process.env.STRIPE_PRICE_DESK,
];
if (stripeValues.some(Boolean) && !stripeValues.every(Boolean))
  throw Error("Configure every Stripe billing variable or none of them");
const billing = stripeValues.every(Boolean)
  ? createStripeBillingGateway({
      restrictedKey: process.env.STRIPE_RESTRICTED_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      prices: {
        observer: process.env.STRIPE_PRICE_OBSERVER!,
        operator: process.env.STRIPE_PRICE_OPERATOR!,
        desk: process.env.STRIPE_PRICE_DESK!,
      },
    })
  : undefined;
const { app, close } = createApplication({
  databasePath: process.env.DATABASE_PATH || "data/studio.sqlite",
  passwordHash: process.env.OWNER_PASSWORD_HASH || "",
  localPasswordless,
  name: process.env.OWNER_NAME || "Juan",
  production: process.env.NODE_ENV === "production",
  publicOrigin: process.env.PUBLIC_ORIGIN,
  billing,
});
const server = app.listen(port, host, () =>
  console.log(`ORBIT listening on port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(async () => {
      await close();
      process.exit(0);
    }),
  );
