import test from "node:test";
import assert from "node:assert/strict";
import { US_JURISDICTIONS, createUsPolicyGate } from "../lib/us-policy.mjs";

test("U.S. policy scope contains all 50 states and Washington, D.C.", () => {
  assert.equal(US_JURISDICTIONS.length, 51);
  assert.equal(new Set(US_JURISDICTIONS.map((item) => item.code)).size, 51);
  assert.ok(US_JURISDICTIONS.some((item) => item.code === "DC"));
});

test("state policy gate requires documents, controls, and legal review", () => {
  const gate = createUsPolicyGate({
    stateCode: "CA",
    sellsOrSharesPersonalData: true,
  });
  assert.equal(gate.jurisdictionName, "California");
  assert.equal(gate.legalReviewRequired, true);
  assert.ok(gate.requiredDocuments.includes("state-privacy-addendum"));
  assert.ok(gate.requiredDocuments.includes("sale-sharing-opt-out-notice"));
  assert.ok(gate.requiredControls.includes("human-review-and-appeal-path"));
});

test("regulated activities remain hard-blocked for specialized review", () => {
  const children = createUsPolicyGate({
    stateCode: "NY",
    activity: "children-directed",
  });
  const advice = createUsPolicyGate({
    stateCode: "TX",
    activity: "investment-advice",
  });
  assert.ok(children.hardBlockers.some((item) => item.includes("coppa")));
  assert.ok(advice.hardBlockers.some((item) => item.includes("registration")));
  assert.throws(
    () => createUsPolicyGate({ stateCode: "XX" }),
    /Invalid U.S. jurisdiction/,
  );
});
