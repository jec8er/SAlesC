import { useEffect, useState } from "react";
import { US_JURISDICTIONS } from "../lib/us-policy.mjs";
import { blockerLabel } from "./mission-labels";

type Mission = {
  id: string;
  goal: string;
  customer: string;
  tasks: { id: string; status: string }[];
  summary: { launchBlocked: boolean; launchBlockers: string[] };
};

export default function OperationsHome({
  csrf,
  openMissions,
}: {
  csrf: string;
  openMissions: () => void;
}) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/business/missions", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Could not load saved missions.");
        const data = await response.json();
        setMissions(data.missions);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(String(cause));
      });
    return () => controller.abort();
  }, []);
  async function prepare(form: HTMLFormElement) {
    if (busy || !loaded) return;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/business/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          goal:
            "Validate a pilot: inquiries, quotes and follow-up for " +
            String(fields.get("customer")),
          customer: String(fields.get("customer")),
          targetState: String(fields.get("state")),
          activity: "general-commerce",
          maxCostCents: 0,
          maxMinutes: 120,
          usesAutomatedDecisions: false,
          sellsOrSharesPersonalData: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not save the pilot.");
      setNotice(
        "Pilot saved. Open missions to work on its tasks. No work has been executed or sent externally.",
      );
      const refresh = await fetch("/api/business/missions");
      if (!refresh.ok)
        throw Error(
          "The pilot was saved, but the list could not refresh. Open missions before trying to create it again.",
        );
      setMissions((await refresh.json()).missions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel operations-home" style={{ padding: 28 }}>
      <p className="eyebrow">ORBIT / OPERATIONS</p>
      <h1>One objective. Visible work. Verifiable results.</h1>
      <p>
        Organize research, offers and service delivery in one private workspace.
      </p>
      <p>
        <strong>Current capability:</strong> planning and evidence tracking. No
        autonomous commercial executor is connected.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <h2>Your work in progress</h2>
      {!loaded && !error && <p role="status">Loading missions…</p>}
      {loaded && missions.length === 0 && (
        <p>No saved missions yet. Prepare a pilot to get started.</p>
      )}
      {missions.map((mission) => (
        <article
          key={mission.id}
          style={{ borderBottom: "1px solid currentColor", padding: "16px 0" }}
        >
          <h3>{mission.goal}</h3>
          <p>
            {mission.customer} ·{" "}
            {mission.tasks.filter((task) => task.status === "completed").length}
            /{mission.tasks.length} tasks completed
          </p>
          <p>
            {mission.summary.launchBlocked
              ? "Preparation pending"
              : "Reviews complete; external execution pending"}
          </p>
          {mission.summary.launchBlockers.length > 0 && (
            <ul>
              {mission.summary.launchBlockers.map((blocker, index) => (
                <li key={index}>{blockerLabel(blocker)}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
      <button className="neon-button" onClick={openMissions}>
        Open missions and evidence
      </button>
      <h2>Prepare the first pilot</h2>
      <p>
        Initial hypothesis: help a cleaning business organize the inquiries and
        quotes it already receives. First, validate the problem with a buyer.
      </p>
      <form
        className="mission-form"
        onSubmit={(event) => {
          event.preventDefault();
          void prepare(event.currentTarget);
        }}
        style={{ display: "grid", gap: 12, maxWidth: 560 }}
      >
        <label>
          Business or customer type
          <input
            name="customer"
            required
            maxLength={500}
            defaultValue="Small cleaning business"
          />
        </label>
        <label>
          U.S. state
          <select name="state" defaultValue="NY" required>
            {US_JURISDICTIONS.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Creating a plan does not authorize spending or sending. External
          budget: USD 0. Initial planning time: 120 minutes.
        </p>
        <button
          className="neon-button"
          disabled={!loaded || busy || Boolean(notice)}
        >
          {busy ? "Saving…" : notice ? "Pilot saved" : "Save pilot plan"}
        </button>
      </form>
      <h2>How we move forward</h2>
      <ol>
        <li>Confirm a problem and record the evidence.</li>
        <li>Prepare an offer with a defined scope and costs.</li>
        <li>Review quality and terms before delivery.</li>
        <li>Prepare sales materials and measure actual payments separately.</li>
      </ol>
      <p>
        A completed task requires a recorded result. A plan, approval or
        estimate does not establish a sale.
      </p>
    </section>
  );
}
