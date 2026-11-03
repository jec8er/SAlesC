import { useEffect, useRef, useState } from "react";

type Result = {
  status: string;
  events: { role: string; output: string }[];
  verdict: { accepted: boolean; defects: string[] };
  revision: string | null;
};

export default function ModelWorkbench({ csrf }: { csrf: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [task, setTask] = useState("");
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const id = useRef("");
  const running = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ecomoda/config", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error("Could not check the model connection.");
        setConfigured(Boolean((await response.json()).configured));
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(String(cause));
      });
    return () => controller.abort();
  }, []);
  async function loadResult(value: string) {
    const response = await fetch(
      `/api/ecomoda/tasks/${encodeURIComponent(value)}/artifacts`,
    );
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Could not load the result.");
    setResult(data.result);
    setTaskId(value);
  }
  async function run() {
    if (running.current || !configured || !task.trim()) return;
    running.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    if (!id.current) id.current = crypto.randomUUID();
    setTaskId(id.current);
    try {
      const response = await fetch("/api/ecomoda/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ id: id.current, task }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409)
        throw Error(data.error || "The task could not complete.");
      await loadResult(id.current);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Check the saved task before retrying.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel business-factory" style={{ padding: 24 }}>
      <p className="eyebrow">ORBIT / MODEL TEAM</p>
      <h1>Plan. Produce. Challenge the result.</h1>
      <p>
        The primary model plans and drafts; a separate specialist reviews the
        result. One revision is allowed when defects are found.
      </p>
      <p>
        Use supplied evidence. This team cannot browse the web, send messages,
        publish, charge customers or verify real-world completion.
      </p>
      {configured === null && !error && (
        <p role="status">Checking model connection…</p>
      )}
      {configured === false && (
        <p role="status">
          Models are not connected to this server. Configure the local model
          runtime or the deployment's inference adapter first.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <form
        className="mission-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <label>
          Task and supporting evidence
          <textarea
            rows={7}
            maxLength={6000}
            required
            value={task}
            disabled={busy || Boolean(taskId)}
            onChange={(event) => setTask(event.target.value)}
          />
        </label>
        <p>
          Do not include credentials or sensitive customer information. A run
          may take several minutes and pauses if memory headroom is
          insufficient.
        </p>
        <button disabled={!configured || busy || Boolean(result)}>
          {busy
            ? "Models are working…"
            : result
              ? "Result saved"
              : taskId
                ? "Retry saved task"
                : "Run model team"}
        </button>
      </form>
      {taskId && (
        <>
          <p>Saved task ID: {taskId}</p>
          <button
            disabled={busy}
            onClick={() => {
              setError("");
              void loadResult(taskId).catch((cause) => setError(String(cause)));
            }}
          >
            Check saved result
          </button>
          <button
            disabled={busy}
            onClick={() => {
              id.current = "";
              setTaskId("");
              setTask("");
              setResult(null);
              setError("");
            }}
          >
            Start a different task
          </button>
        </>
      )}
      <details>
        <summary>Recover an earlier task</summary>
        <form
          className="mission-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = String(
              new FormData(event.currentTarget).get("savedId") || "",
            ).trim();
            setError("");
            void loadResult(value).catch((cause) => setError(String(cause)));
          }}
        >
          <label>
            Saved task ID
            <input
              name="savedId"
              required
              maxLength={160}
              pattern="[A-Za-z0-9][A-Za-z0-9._:\-]*"
            />
          </label>
          <button disabled={busy}>Load saved artifacts</button>
        </form>
      </details>
      {result && (
        <article>
          <h2>
            {result.verdict.accepted
              ? "Model review passed — independent validation pending"
              : "Revision produced — further validation required"}
          </h2>
          <p>
            Model agreement is not proof of correctness, publication or revenue.
          </p>
          {result.events.map((event, index) => (
            <details key={index} open={event.role === "Hugo"}>
              <summary>
                {event.role === "Betty"
                  ? "Plan"
                  : event.role === "Marcela"
                    ? "Independent model review"
                    : "Draft / revision"}
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {event.output}
              </pre>
            </details>
          ))}
        </article>
      )}
    </section>
  );
}
