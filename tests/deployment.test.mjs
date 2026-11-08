import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("static previews support ORBIT deep links", async () => {
  const netlify = await readFile("public/_redirects", "utf8");
  assert.match(netlify, /^\/api\/\*\s+\/api-unavailable\.json\s+503!/m);
  assert.match(netlify, /^\/\*\s+\/index\.html\s+200$/m);

  const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.deepEqual(vercel.rewrites, [
    { source: "/(.*)", destination: "/index.html" },
  ]);
});

test("static previews return a bounded API error instead of HTML", async () => {
  const unavailable = JSON.parse(
    await readFile("public/api-unavailable.json", "utf8"),
  );
  assert.equal(typeof unavailable.error, "string");
  assert.match(unavailable.error, /static preview/i);
});
