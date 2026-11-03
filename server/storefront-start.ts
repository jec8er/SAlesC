import express from "express";
import { DatabaseSync } from "node:sqlite";
import { mountQuoteStore } from "./quote-store.ts";

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.get("/", (_req, res) => res.redirect(302, "/store/quote-kit"));
mountQuoteStore(app, new DatabaseSync(":memory:"));
app.listen(Number(process.env.PORT || 3001), "0.0.0.0");

