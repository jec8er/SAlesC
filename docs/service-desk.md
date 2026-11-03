# ORBIT service desk

Status: private owner workflow. All application copy and generated documents are English.

## Working flow

1. Open Service desk from the navigation or operations home.
2. Save an authorized inquiry with a customer label, optional contact reference,
   request and source.
3. Create a quote draft with scope, an explicit USD amount and tax/fee terms.
4. Review and approve the current quote. A new version always starts unapproved;
   earlier versions remain in the record.
5. Add dated internal follow-up tasks and mark them complete after actual work.
6. Update inquiry status based on the owner's actual knowledge.
7. Export the complete record as JSON or the current quote as a plain-text draft.

The service desk does not send emails, issue notifications, charge money or record
customer acceptance. Won status does not create a receipt or count as collected
revenue. Public forms, separate customer accounts, multi-tenant isolation and
automatic service delivery are not part of this implementation.

## Persistence and access

`service_inquiries` is a new table in the existing SQLite database. Startup creates
the table without deleting or rewriting older records. Each inquiry is independent
of the market-simulation workspace and commercial mission planner. A record keeps
quote versions, follow-up completion timestamps and action history.

The authenticated owner can list/create inquiries and apply typed actions through
`/api/service/inquiries` and `/api/service/inquiries/:id/actions`. Writes use the
existing session, origin and CSRF protections. Optimistic revisions reject stale
edits. Server validation enforces integer cents, real dates, bounded text and
record/history limits. Approval only applies to the current quote version.

No destructive route is added. Privacy-request deletion, retention automation and
backup expiry still require an implemented procedure before public customer use.
The interface advises against entering credentials, payment details, access codes
and sensitive household information. Exports contain the selected record and must
be handled as private data when real customers are involved.

If a write succeeds, the interface updates from the returned saved record. If the
network outcome is unknown or a revision conflicts, further writes are blocked
until a reload confirms the stored record; draft field values are preserved where
the selected record remains mounted. Create retries reuse the inquiry ID until a
successful acknowledgement to avoid duplicate inquiries.

## Verification

The integration scenario covers authentication, CSRF, duplicate create protection,
integer-cent validation, stale revisions, quote approval/versioning, invalid
calendar dates, follow-up completion, restart persistence and separation from
payment receipts. Export checks ensure an old approved version cannot make a new
draft appear approved.

Browser checks use clearly labeled fictional records in an isolated local database.
They do not demonstrate buyer demand, legal approval, real customer delivery or
autonomous execution.
