import { test } from "node:test";
import assert from "node:assert/strict";
import { trustControls, trustSummary } from "../lib/trust.ts";

test("trust center exposes exactly twenty unique and evidence-backed controls", () => {
  assert.equal(trustControls.length, 20);
  assert.equal(new Set(trustControls.map((control) => control.id)).size, 20);
  for (const control of trustControls) {
    assert.ok(control.title.length > 8);
    assert.ok(control.evidence.length > 20);
  }
});

test("trust center blocks launch while owner and professional actions remain", () => {
  const summary = trustSummary();
  assert.equal(
    summary.verified + summary.ownerAction + summary.professionalReview,
    summary.total,
  );
  assert.equal(summary.launchReady, false);
  assert.ok(summary.ownerAction > 0);
  assert.ok(summary.professionalReview > 0);
});

test("launch readiness becomes true only when every control is verified", () => {
  const verified = trustControls.map((control) => ({
    ...control,
    status: "verified" as const,
  }));
  assert.equal(trustSummary(verified).launchReady, true);
});
