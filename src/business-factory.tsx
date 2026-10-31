import { useEffect, useState } from "react";
import { US_JURISDICTIONS } from "../lib/us-policy.mjs";
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
          costCents: 0,
          minutes: 0,
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
  async function reload() {
    const response = await fetch("/api/business/missions");
    if (!response.ok) throw Error("Cannot load missions");
    setMissions((await response.json()).missions);
  }
  useEffect(() => {
    void reload().catch((e) => setError(String(e)));
  }, []);
  async function write(url: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Request failed");
      await reload();
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
    approved?: boolean,
  ) {
    const payload: Record<string, unknown> = {
      revision: m.revision,
      action: kind,
      taskId: t.id,
    };
    if (kind === "submit") {
      const summary = window.prompt("Describe the completed artifact:");
      if (!summary) return;
      const evidenceRequired = t.id === "research" || t.id === "policy";
      const source =
        window.prompt(
          evidenceRequired
            ? "Evidence URL or reference (required for this review):"
            : "Evidence URL or reference (optional):",
        ) || "";
      payload.artifact = {
        kind: t.expectedArtifact,
        summary,
        evidence: source.trim() ? [source.trim()] : [],
        costCents: 0,
        minutes: 0,
      };
    }
    if (kind === "review") {
      const note = window.prompt("Review note:");
      if (!note) return;
      payload.decision = { approved, note };
    }
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
    <section className="panel" style={{ padding: 24 }}>
      <h2>Business Factory</h2>
      <p>
        Commercial planning, not autonomous execution. No messages, listings or
        payments are sent.
      </p>
      {error && <p role="alert">{error}</p>}
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
        <button disabled={busy} type="submit">
          Create mission
        </button>
      </form>
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
              Launch gate: {m.summary.launchBlocked ? "BLOCKED" : "APPROVED"}
              {m.summary.launchBlocked &&
                ` — ${m.summary.launchBlockers.join(", ")}`}
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
                {t.artifact && <p>Artifact: {t.artifact.summary}</p>}
                {t.artifact?.policyReview && (
                  <p>
                    Review: {t.artifact.policyReview.reviewerName} ·{" "}
                    {t.artifact.policyReview.reviewerRole} ·{" "}
                    {new Date(
                      t.artifact.policyReview.reviewedAt,
                    ).toLocaleDateString()}
                  </p>
                )}
                {t.status === "ready" && (
                  <button disabled={busy} onClick={() => action(m, t, "start")}>
                    Start
                  </button>
                )}
                {t.status === "running" && t.id === "policy" && (
                  <PolicyReviewForm
                    mission={m}
                    task={t}
                    busy={busy}
                    submit={(artifact) => submitPolicyReview(m, t, artifact)}
                  />
                )}
                {t.status === "running" && t.id !== "policy" && (
                  <button
                    disabled={busy}
                    onClick={() => action(m, t, "submit")}
                  >
                    Submit artifact
                  </button>
                )}
                {t.status === "review" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => action(m, t, "review", true)}
                    >
                      Approve
                    </button>{" "}
                    <button
                      disabled={busy}
                      onClick={() => action(m, t, "review", false)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
