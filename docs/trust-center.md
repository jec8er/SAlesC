# ORBIT Trust Center

The Trust Center converts a broad “things to do before launch” checklist into a conservative, evidence-backed product gate. It does not assert that ORBIT complies with every law or accessibility standard, and it does not promise to prevent disputes.

## Status meanings

- **Verified in code:** the repository contains direct evidence for the control. This is not third-party certification.
- **Owner action:** accurate business facts, operational decisions or user-facing policies must be supplied and maintained by the owner.
- **Professional review:** qualified legal or accessibility review is required before treating the item as complete.

`launchReady` is false whenever any control is not verified. This deliberately prevents a polished checklist from becoming a false compliance claim.

## Product rules

1. Do not generate legal policies from assumptions. Policies must match the actual product, jurisdiction, vendors and data practices.
2. Do not enable public payments while required owner or professional actions remain open.
3. Do not add analytics, advertising or tracking SDKs without updating the vendor inventory and consent design.
4. Do not claim WCAG conformance from automated checks alone; keyboard and assistive-technology testing remain necessary.
5. Preserve paper-only execution, explicit risk gates and the audit trail. Trust controls do not weaken trading safeguards.
6. Keep export and deletion procedures testable before accepting external users.

## Repository evidence

The current verified controls include data minimization, the absence of third-party trackers and payment routes, server-side session and CSRF protections, restrictive browser headers, bounded claims, authentic empty states, fee-aware backtests, workspace export, keyboard navigation improvements and accessible labels for key controls.

The owner must still provide accurate company/contact details, approve the refund position, document an incident-response process and decide whether children are excluded. Privacy, terms, accessibility and jurisdiction-specific obligations require professional review before public launch.

## Review references

- [U.S. Department of Justice: Guidance on Web Accessibility and the ADA](https://www.ada.gov/resources/web-guidance/)
- [W3C: Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [FTC: Protecting Personal Information — A Guide for Business](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business)

These references are starting points, not a substitute for advice tailored to ORBIT's users, markets and jurisdictions.
