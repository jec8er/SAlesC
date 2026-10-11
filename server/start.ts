import { createApplication } from "./app.ts";
import { createFileStore } from "../lib/ecomoda-file-store.mjs";
import { createProjectMemoryStore } from "../lib/ecomoda-project-memory.mjs";
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("Invalid PORT");
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
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`SaborClick Studio listening on port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      close();
      process.exit(0);
    }),
  );
