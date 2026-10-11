import { DatabaseSync } from "node:sqlite";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** One store per cycle. Use a persistent volume for this private database.
 * Expired workers cannot append, finish or release another worker's claim.
 */
export function createCycleStore(path, { now = Date.now, leaseMs = 600000 } = {}) {
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1000) throw Error("Invalid lease");
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(`CREATE TABLE IF NOT EXISTS ai_cycles(
    id TEXT PRIMARY KEY, task_hash TEXT NOT NULL, owner TEXT,
    lease_until INTEGER, state TEXT NOT NULL, result TEXT);
    CREATE TABLE IF NOT EXISTS ai_events(
    seq INTEGER PRIMARY KEY AUTOINCREMENT, cycle_id TEXT NOT NULL,
    event TEXT NOT NULL);`);
  const owner = randomUUID();
  const held = new Set();
  const digest = text => createHash("sha256").update(text).digest("hex");
  function transaction(fn) {
    db.exec("BEGIN IMMEDIATE");
    try { const r = fn(); db.exec("COMMIT"); return r; }
    catch (e) { db.exec("ROLLBACK"); throw e; }
  }
  function owned(id) {
    const row = db.prepare("SELECT * FROM ai_cycles WHERE id=?").get(id);
    if (!held.has(id) || row?.owner !== owner || row.state !== "running"
      || row.lease_until <= now()) throw Error("Cycle lease lost");
    return row;
  }
  return {
    claim(id, task = "") {
      return transaction(() => {
        const row = db.prepare("SELECT * FROM ai_cycles WHERE id=?").get(id);
        const hash = digest(task);
        if (row && row.task_hash !== hash) throw Error("Cycle ID already belongs to a different task");
        if (row?.state === "finished" || (row?.state === "running" && row.lease_until > now())) return false;
        db.prepare(`INSERT INTO ai_cycles(id,task_hash,owner,lease_until,state)
          VALUES(?,?,?,?,'running') ON CONFLICT(id) DO UPDATE SET
          owner=excluded.owner, lease_until=excluded.lease_until, state='running'`)
          .run(id, hash, owner, now()+leaseMs);
        held.add(id); return true;
      });
    },
    append(id, event) {
      const payload = JSON.stringify(event);
      if (payload.length > 100000) throw Error("Event too large");
      transaction(() => { owned(id); db.prepare("INSERT INTO ai_events(cycle_id,event) VALUES(?,?)").run(id,payload); });
    },
    checkpoints(id) {
      owned(id);
      return db.prepare("SELECT event FROM ai_events WHERE cycle_id=? ORDER BY seq").all(id)
        .map(row => JSON.parse(row.event));
    },
    finish(id, result) {
      transaction(() => { owned(id); db.prepare("UPDATE ai_cycles SET state='finished',result=?,owner=NULL,lease_until=NULL WHERE id=?")
        .run(JSON.stringify(result), id); });
      held.delete(id);
    },
    release(id) {
      transaction(() => { owned(id); db.prepare("UPDATE ai_cycles SET state='retryable',owner=NULL,lease_until=NULL WHERE id=?").run(id); });
      held.delete(id);
    },
    read(id) {
      const row = db.prepare("SELECT id,state,result FROM ai_cycles WHERE id=?").get(id);
      return row ? {...row, result:row.result ? JSON.parse(row.result) : null} : null;
    },
    close() { db.close(); }
  };
}
