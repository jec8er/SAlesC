import { createApplication } from "./app.ts";
import { createFileStore } from "../lib/ecomoda-file-store.mjs";
import { createProjectMemoryStore } from "../lib/ecomoda-project-memory.mjs";
import { createStripeBillingGateway } from "./billing.ts";
import { createLocalInference } from "./local-inference.ts";
const port = Number(process.env.PORT || 3001);
const localModels = [
  process.env.ORBIT_LLM_BINARY,
  process.env.ORBIT_PRIMARY_MODEL,
  process.env.ORBIT_REVIEW_MODEL,
];
if (localModels.some(Boolean) && !localModels.every(Boolean))
  throw Error("Configure the runtime and both local models together");
const ecomodaInfer = localModels.every(Boolean)
  ? await createLocalInference({
      binary: localModels[0]!,
      primaryModel: localModels[1]!,
      reviewModel: localModels[2]!,
      stateDirectory: process.env.ORBIT_LLM_SCRATCH || "data/local-inference",
      threads: Number(process.env.ORBIT_LLM_THREADS || 2),
      reserveMiB: Number(process.env.ORBIT_LLM_RESERVE_MIB || 1536),
    })
  : undefined;
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
  name: process.env.OWNER_NAME || "Juan",
  production: process.env.NODE_ENV === "production",
  publicOrigin: process.env.PUBLIC_ORIGIN,
  ecomodaStore: createFileStore(
    process.env.ECOMODA_STATE_DIR || "data/ecomoda",
  ),
  ecomodaMemory: createProjectMemoryStore(
    process.env.ECOMODA_MEMORY_DIR || "data/ecomoda-memory",
  ),
  billing,
  ecomodaInfer,
  ecomodaTimeoutMs: ecomodaInfer ? 300000 : undefined,
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`ORBIT listening on port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
