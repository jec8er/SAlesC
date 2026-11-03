import { useEffect, useState } from "react";
import { US_JURISDICTIONS } from "../lib/us-policy.mjs";
import { blockerLabel } from "./mission-labels";
type Task = {
  id: string;
  department: string;
  status: string;
  expectedArtifact: string;
  artifact: null | {
    summary: string;
    evidence: string[];
    policyReview?: {
      reviewerName: string;
      reviewerRole: string;
      reviewedAt: string;
      completedDocuments: string[];
      completedControls: string[];
      resolvedBlockers: string[];
    };
  };
  maxCostCents: number;
  maxMinutes: number;
  actualCostCents: number;
  actualMinutes: number;
  approval: null | { approved: boolean; note: string };
};
type Mission = {
  id: string;
  goal: string;
  customer: string;
  targetState?: string;
  policyGate?: {
    jurisdictionName: string;
    activity: string;
    requiredDocuments: string[];
    requiredControls: string[];
    hardBlockers: string[];
    disclaimer: string;
  };
  revision: number;
  tasks: Task[];
  summary: { launchBlocked: boolean; launchBlockers: string[] };
};

function ArtifactForm({
  task,
  busy,
  submit,
}: {
  task: Task;
  busy: boolean;
  submit: (artifact: Record<string, unknown>) => void;
}) {
  return (
    <form
      className="mission-form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        submit({
          kind: task.expectedArtifact,
          summary: String(fields.get("summary") || "").trim(),
          evidence: String(fields.get("evidence") || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
          costCents: Math.round(Number(fields.get("cost")) * 100),
          minutes: Number(fields.get("minutes")),
        });
      }}
    >
      <label>
        Completed work
        <textarea name="summary" required maxLength={2000} rows={3} />
      </label>
      <label>
        Evidence references (one per line, up to 20)
        <textarea
          name="evidence"
          required={task.id === "research"}
          rows={3}
          maxLength={40019}
        />
      </label>
      <p>
        Describe an actual result. A plan or generated draft does not prove
        external execution.
      </p>
      <label>
        Actual cost (USD)
        <input
          name="cost"
          type="number"
          min={0}
          max={task.maxCostCents / 100}
          step="0.01"
          defaultValue="0"
          required
        />
      </label>
      <label>
        Actual time (minutes)
        <input
          name="minutes"
          type="number"
          min={0}
          max={task.maxMinutes}
          step="1"
          defaultValue="0"
          required
        />
      </label>
      <button disabled={busy} type="submit">
        Submit artifact for review
      </button>
    </form>
  );
}

function ReviewForm({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (approved: boolean, note: string) => void;
}) {
  return (
    <form
      className="mission-form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        submit(
          fields.get("decision") === "approve",
          String(fields.get("note") || "").trim(),
        );
      }}
    >
      <label>
        Review decision
        <select name="decision" defaultValue="" required>
          <option value="" disabled>
            Choose a decision
          </option>
          <option value="approve">Approve recorded work</option>
          <option value="reject">Reject and block dependent work</option>
        </select>
      </label>
      <label>
        Review note
        <textarea name="note" required maxLength={2000} rows={2} />
      </label>
      <p>
        Approval records your review. It does not send, publish or collect
        payment.
      </p>
      <button disabled={busy} type="submit">
        Save review decision
      </button>
    </form>
  );
}

function PolicyReviewForm({
  mission,
  task,
  busy,
  submit,
}: {
  mission: Mission;
  task: Task;
  busy: boolean;
  submit: (artifact: Record<string, unknown>) => void;
}) {
  const gate = mission.policyGate;
  if (!gate)
    return <p>Policy metadata is missing. This mission stays blocked.</p>;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const date = String(fields.get("reviewedAt") || "");
        submit({
          kind: task.expectedArtifact,
          summary: String(fields.get("summary") || ""),
          evidence: [String(fields.get("evidence") || "")],
          costCents: Math.round(Number(fields.get("cost")) * 100),
          minutes: Number(fields.get("minutes")),
          policyReview: {
            reviewerName: String(fields.get("reviewerName") || ""),
            reviewerRole: String(fields.get("reviewerRole") || "owner"),
            reviewedAt: new Date(`${date}T12:00:00.000Z`).toISOString(),
            completedDocuments: fields.getAll("completedDocuments"),
            completedControls: fields.getAll("completedControls"),
            resolvedBlockers: fields.getAll("resolvedBlockers"),
          },
        });
      }}
      style={{ display: "grid", gap: 10, marginTop: 12 }}
    >
      <strong>Structured U.S. policy review</strong>
      <label>
        Review summary <input name="summary" required maxLength={2000} />
      </label>
      <label>
        Reviewer name <input name="reviewerName" required maxLength={2000} />
      </label>
      <label>
        Reviewer role{" "}
        <select name="reviewerRole" defaultValue="owner" required>
          <option value="owner">Owner — preparation only</option>
          <option value="compliance-professional">
            Compliance professional — preparation only
          </option>
          <option value="licensed-attorney">
            Licensed attorney — required for approval
          </option>
        </select>
      </label>
      <label>
        Review date{" "}
        <input
          name="reviewedAt"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </label>
      <fieldset>
        <legend>Documents reviewed</legend>
        {gate.requiredDocuments.map((item) => (
          <label key={item} style={{ display: "block" }}>
            <input
              type="checkbox"
              name="completedDocuments"
              value={item}
              required
            />{" "}
            {item}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Operational controls verified</legend>
        {gate.requiredControls.map((item) => (
          <label key={item} style={{ display: "block" }}>
            <input
              type="checkbox"
              name="completedControls"
              value={item}
              required
            />{" "}
            {item}
          </label>
        ))}
      </fieldset>
      {gate.hardBlockers.length > 0 && (
        <fieldset>
          <legend>Specialized blockers resolved</legend>
          {gate.hardBlockers.map((item) => (
            <label key={item} style={{ display: "block" }}>
              <input
                type="checkbox"
                name="resolvedBlockers"
                value={item}
                required
              />{" "}
              {item}
            </label>
          ))}
        </fieldset>
      )}
      <label>
        Evidence URL or internal reference{" "}
        <input name="evidence" required maxLength={2000} />
      </label>
      <label>
        Actual cost (USD)
        <input
          name="cost"
          type="number"
          min={0}
          max={task.maxCostCents / 100}
          step="0.01"
          defaultValue="0"
          required
        />
      </label>
      <label>
        Actual time (minutes)
        <input
          name="minutes"
          type="number"
          min={0}
          max={task.maxMinutes}
          step="1"
          defaultValue="0"
          required
        />
      </label>
      <button disabled={busy} type="submit">
        Submit policy dossier
      </button>
    </form>
  );
}

export default function BusinessFactory({ csrf }: { csrf: string }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  async function reload() {
    const response = await fetch("/api/business/missions");
    if (!response.ok) throw Error("Cannot load missions");
    setMissions((await response.json()).missions);
    setLoaded(true);
  }
  useEffect(() => {
    void reload().catch((e) => setError(String(e)));
  }, []);
  async function write(url: string, body: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Request failed");
      setNotice("Saved. No external action was performed.");
      try {
        await reload();
      } catch {
        setLoaded(false);
        setError(
          "The change was saved, but the list could not refresh. Reload missions before submitting again.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  function create(form: HTMLFormElement) {
    const fields = new FormData(form);
    void write("/api/business/missions", {
      id: crypto.randomUUID(),
      goal: String(fields.get("goal") || ""),
      customer: String(fields.get("customer") || ""),
      maxCostCents: Math.round(Number(fields.get("budget") || 0) * 100),
      maxMinutes: Number(fields.get("minutes") || 120),
      targetState: String(fields.get("targetState") || "NY"),
      activity: String(fields.get("activity") || "general-commerce"),
      sellsOrSharesPersonalData: fields.get("personalData") === "on",
      usesAutomatedDecisions: true,
    });
  }
  function action(
    m: Mission,
    t: Task,
    kind: "start" | "submit" | "review",
    extra: Record<string, unknown> = {},
  ) {
    const payload: Record<string, unknown> = {
      revision: m.revision,
      action: kind,
      taskId: t.id,
      ...extra,
    };
    void write(
      "/api/business/missions/" + encodeURIComponent(m.id) + "/actions",
      payload,
    );
  }
  function submitPolicyReview(
    mission: Mission,
    task: Task,
    artifact: Record<string, unknown>,
  ) {
    void write(
      "/api/business/missions/" + encodeURIComponent(mission.id) + "/actions",
      {
        revision: mission.revision,
        action: "submit",
        taskId: task.id,
        artifact,
      },
    );
  }
  return (
    <section className="panel business-factory" style={{ padding: 24 }}>
      <h2>Business Factory</h2>
      <p>
        Commercial planning, not autonomous execution. No messages, listings or
        payments are sent.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!loaded && !error && <p role="status">Loading saved missions…</p>}
      {error && (
        <button
          disabled={busy}
          onClick={() => {
            setError("");
            void reload().catch((cause) => setError(String(cause)));
          }}
        >
          Reload missions
        </button>
      )}
      {loaded && missions.length === 0 && (
        <p>No missions yet. Create a bounded plan below to begin.</p>
      )}
      <details open={missions.length === 0}>
        <summary>Create a mission</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create(e.currentTarget);
          }}
          style={{ display: "grid", gap: 12, maxWidth: 540 }}
        >
          <label>
            Goal{" "}
            <input
              name="goal"
              required
              maxLength={2000}
              placeholder="Validate Direct Commerce Launch"
            />
          </label>
          <label>
            Customer{" "}
            <input
              name="customer"
              required
              maxLength={2000}
              placeholder="Local merchants"
            />
          </label>
          <label>
            U.S. launch state{" "}
            <select name="targetState" defaultValue="NY" required>
              {US_JURISDICTIONS.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            Business activity{" "}
            <select name="activity" defaultValue="general-commerce" required>
              <option value="general-commerce">General commerce</option>
              <option value="financial-education">Financial education</option>
              <option value="investment-advice">Investment advice</option>
              <option value="children-directed">Directed to children</option>
            </select>
          </label>
          <label>
            <input name="personalData" type="checkbox" /> Sell or share personal
            data
          </label>
          <label>
            Budget ($){" "}
            <input
              name="budget"
              type="number"
              min="0"
              max="10000"
              step=".01"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Minutes{" "}
            <input
              name="minutes"
              type="number"
              min="0"
              max="1000000"
              defaultValue="120"
              required
            />
          </label>
          <button disabled={busy || !loaded} type="submit">
            Create mission
          </button>
        </form>
      </details>
      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {missions.map((m) => (
          <article
            key={m.id}
            style={{ border: "1px solid #777", borderRadius: 12, padding: 16 }}
          >
            <h3>{m.goal}</h3>
            <p>
              Customer: {m.customer} · Revision {m.revision}
            </p>
            <p>
              U.S. policy scope:{" "}
              {m.policyGate
                ? `${m.policyGate.jurisdictionName} (${m.targetState}) · ${m.policyGate.activity}`
                : "Legacy mission — create a new mission for a state-specific review"}
            </p>
            <p role="status">
              Launch gate:{" "}
              {m.summary.launchBlocked
                ? "BLOCKED"
                : "REVIEWS COMPLETE — external execution not enabled"}
              {m.summary.launchBlocked &&
                ` — ${m.summary.launchBlockers.map((blocker) => blockerLabel(blocker)).join(" ")}`}
            </p>
            {m.policyGate && (
              <details>
                <summary>Required U.S. policy package</summary>
                <p>{m.policyGate.disclaimer}</p>
                <strong>Documents</strong>
                <ul>
                  {m.policyGate.requiredDocuments.map((document) => (
                    <li key={document}>{document}</li>
                  ))}
                </ul>
                <strong>Controls</strong>
                <ul>
                  {m.policyGate.requiredControls.map((control) => (
                    <li key={control}>{control}</li>
                  ))}
                </ul>
                {m.policyGate.hardBlockers.length > 0 && (
                  <p>
                    Specialized review required:{" "}
                    {m.policyGate.hardBlockers.join(", ")}
                  </p>
                )}
              </details>
            )}
            {m.tasks.map((t) => (
              <div
                key={t.id}
                style={{ borderTop: "1px solid #777", padding: 10 }}
              >
                <strong>
                  {t.department} / {t.id}
                </strong>{" "}
                — {t.status}
                <p>
                  Output: {t.expectedArtifact} · Cap{" "}
                  {(t.maxCostCents / 100).toFixed(2)} USD / {t.maxMinutes} min
                </p>
                <p>
                  Recorded usage: {(t.actualCostCents / 100).toFixed(2)} USD /{" "}
                  {t.actualMinutes} min
                </p>
                {t.artifact && (
                  <>
                    <p>Artifact: {t.artifact.summary}</p>
                    <ul aria-label="Evidence references">
                      {t.artifact.evidence.map((reference, index) => (
                        <li key={index}>{reference}</li>
                      ))}
                    </ul>
                  </>
                )}
                {t.artifact?.policyReview && (
                  <p>
                    Review: {t.artifact.policyReview.reviewerName} ·{" "}
                    {t.artifact.policyReview.reviewerRole} ·{" "}
                    {new Date(
                      t.artifact.policyReview.reviewedAt,
                    ).toLocaleDateString()}
                  </p>
                )}
                {t.approval && (
                  <p>
                    Last review: {t.approval.approved ? "Approved" : "Rejected"}{" "}
                    — {t.approval.note}
                  </p>
                )}
                {t.status === "ready" && (
                  <button
                    disabled={busy || !loaded}
                    onClick={() => action(m, t, "start")}
                  >
                    Start
                  </button>
                )}
                {t.status === "running" && t.id === "policy" && (
                  <PolicyReviewForm
                    mission={m}
                    task={t}
                    busy={busy || !loaded}
                    submit={(artifact) => submitPolicyReview(m, t, artifact)}
                  />
                )}
                {t.status === "running" && t.id !== "policy" && (
                  <ArtifactForm
                    task={t}
                    busy={busy || !loaded}
                    submit={(artifact) => action(m, t, "submit", { artifact })}
                  />
                )}
                {t.status === "review" && (
                  <ReviewForm
                    busy={busy || !loaded}
                    submit={(approved, note) =>
                      action(m, t, "review", { decision: { approved, note } })
                    }
                  />
                )}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
