import type { Express, RequestHandler } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  inquiryInput,
  serviceAction,
  newInquiry,
  updateInquiry,
  type Inquiry,
} from "../lib/service-desk.ts";

export function mountServiceDesk(
  app: Express,
  db: DatabaseSync,
  auth: RequestHandler,
  now: () => number,
) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS service_inquiries (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)",
  );
  app.get("/api/service/inquiries", auth, (_req, res) => {
    const rows = db
      .prepare(
        "SELECT payload FROM service_inquiries ORDER BY updated_at DESC, id LIMIT 1000",
      )
      .all() as { payload: string }[];
    res.json({ inquiries: rows.map((row) => JSON.parse(row.payload)) });
  });
  app.post("/api/service/inquiries", auth, (req, res) => {
    const parsed = inquiryInput.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        error: "Enter a customer, request and valid inquiry details.",
      });
    if (
      (
        db.prepare("SELECT COUNT(*) AS count FROM service_inquiries").get() as {
          count: number;
        }
      ).count >= 1000
    )
      return res.status(409).json({
        error:
          "Inquiry capacity reached. Export records before expanding storage.",
      });
    const inquiry = newInquiry(parsed.data, new Date(now()).toISOString());
    const result = db
      .prepare(
        "INSERT OR IGNORE INTO service_inquiries(id,payload,revision,updated_at) VALUES(?,?,?,?)",
      )
      .run(inquiry.id, JSON.stringify(inquiry), 0, inquiry.updatedAt);
    if (!result.changes)
      return res.status(409).json({
        error: "This inquiry already exists. Reload to check the saved record.",
      });
    res.status(201).json({ inquiry });
  });
  app.post("/api/service/inquiries/:id/actions", auth, (req, res) => {
    const parsed = serviceAction.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({
        error: "Invalid change. Check required fields, date and amount.",
      });
    const row = db
      .prepare("SELECT payload,revision FROM service_inquiries WHERE id=?")
      .get(String(req.params.id)) as
      | { payload: string; revision: number }
      | undefined;
    if (!row) return res.status(404).json({ error: "Inquiry not found." });
    if (row.revision !== parsed.data.revision)
      return res
        .status(409)
        .json({ error: "This inquiry changed. Reload before saving again." });
    let inquiry: Inquiry;
    try {
      inquiry = updateInquiry(
        JSON.parse(row.payload),
        parsed.data,
        new Date(now()).toISOString(),
      );
    } catch (cause) {
      return res.status(400).json({
        error: cause instanceof Error ? cause.message : "Invalid change.",
      });
    }
    const result = db
      .prepare(
        "UPDATE service_inquiries SET payload=?,revision=?,updated_at=? WHERE id=? AND revision=?",
      )
      .run(
        JSON.stringify(inquiry),
        inquiry.revision,
        inquiry.updatedAt,
        inquiry.id,
        row.revision,
      );
    if (!result.changes)
      return res
        .status(409)
        .json({ error: "This inquiry changed. Reload before saving again." });
    res.json({ inquiry });
  });
}
