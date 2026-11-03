import { useEffect, useRef, useState } from "react";
import type { Inquiry, ServiceAction } from "../lib/service-desk";
import { quoteText } from "../lib/service-desk";

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function ServiceDesk({ csrf }: { csrf: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const saving = useRef(false);
  const newId = useRef(crypto.randomUUID());
  const selected = inquiries.find((item) => item.id === selectedId);
  async function reload(signal?: AbortSignal) {
    const response = await fetch("/api/service/inquiries", { signal });
    if (!response.ok)
      throw Error("Could not load inquiries. Check your session and reload.");
    const data = await response.json();
    setInquiries(data.inquiries);
    setSelectedId((current) =>
      data.inquiries.some((item: Inquiry) => item.id === current)
        ? current
        : data.inquiries[0]?.id || "",
    );
    setLoaded(true);
    setConflict(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal).catch((cause) => {
      if (!controller.signal.aborted) setError(String(cause));
    });
    return () => controller.abort();
  }, []);
  async function save(url: string, body: unknown) {
    if (saving.current || !loaded || conflict) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let responseReceived = false;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      responseReceived = true;
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw Error(
          data.error || "Could not save. Your form entries are preserved.",
        );
      }
      const record = data.inquiry as Inquiry;
      setInquiries((previous) => [
        record,
        ...previous.filter((item) => item.id !== record.id),
      ]);
      setSelectedId(record.id);
      setNotice(
        "Saved to your private workspace. Nothing was sent or charged.",
      );
      return true;
    } catch (cause) {
      if (!responseReceived) {
        setConflict(true);
        setError(
          "The save outcome is unknown. Reload to check the saved record before retrying. Your form entries are preserved.",
        );
        return false;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Save outcome is unknown. Reload to check before retrying.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function create(form: HTMLFormElement) {
    const fields = new FormData(form);
    if (
      await save("/api/service/inquiries", {
        id: newId.current,
        customer: String(fields.get("customer")),
        contact: String(fields.get("contact")),
        request: String(fields.get("request")),
        source: String(fields.get("source")),
      })
    ) {
      newId.current = crypto.randomUUID();
      form.reset();
    }
  }
  function act(action: ServiceAction) {
    if (!selected) return Promise.resolve(false);
    return save(
      `/api/service/inquiries/${encodeURIComponent(selected.id)}/actions`,
      action,
    );
  }
  function exportRecord() {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-inquiry-${selected.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function exportQuote() {
    if (!selected || !selected.quotes.length) return;
    const url = URL.createObjectURL(
      new Blob([quoteText(selected)], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `orbit-quote-${selected.id}-v${selected.quotes.length}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  const disabled = busy || !loaded || conflict;
  const quote = selected?.quotes.at(-1);
  const outstanding = inquiries.reduce(
    (count, item) =>
      count + item.followUps.filter((task) => !task.completedAt).length,
    0,
  );
  return (
    <section className="panel service-desk" style={{ padding: 24 }}>
      <p className="eyebrow">ORBIT / SERVICE DESK</p>
      <h1>From inquiry to a reviewed quote.</h1>
      <p>
        Private owner records. Follow-ups are internal tasks; notifications and
        customer sending are not connected.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!loaded && !error && <p role="status">Loading inquiries…</p>}
      <button
        disabled={busy}
        onClick={() => {
          setError("");
          void reload().catch((cause) => setError(String(cause)));
        }}
      >
        Reload inquiries
      </button>
      {loaded && (
        <p>
          {inquiries.length} inquiries · {outstanding} open follow-ups · Won
          status is not collected revenue.
        </p>
      )}
      <details open={inquiries.length === 0}>
        <summary>Add an inquiry</summary>
        <form
          className="mission-form"
          onSubmit={(event) => {
            event.preventDefault();
            void create(event.currentTarget);
          }}
        >
          <label>
            Customer or business
            <input name="customer" required maxLength={180} />
          </label>
          <label>
            Contact reference (optional)
            <input name="contact" maxLength={254} />
          </label>
          <label>
            Service request
            <textarea name="request" required rows={3} maxLength={2000} />
          </label>
          <label>
            Inquiry source
            <select name="source" defaultValue="referral">
              <option value="referral">Referral</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
          </label>
          <p>
            Use only authorized information. Do not enter passwords, access
            codes, payment details or sensitive household data.
          </p>
          <button type="submit" disabled={disabled}>
            Save inquiry
          </button>
        </form>
      </details>
      {loaded && inquiries.length === 0 && (
        <p>
          No inquiries yet. Add one from a real authorized request or use
          clearly labeled demonstration data.
        </p>
      )}
      <div className="service-grid">
        <nav aria-label="Saved inquiries" className="service-list">
          {inquiries.map((item) => (
            <button
              key={item.id}
              disabled={busy}
              aria-current={item.id === selectedId ? "true" : undefined}
              onClick={() => {
                setSelectedId(item.id);
                setNotice("");
              }}
            >
              <strong>{item.customer}</strong>
              <span>
                {item.status} · {item.quotes.length} quote versions
              </span>
            </button>
          ))}
        </nav>
        {selected ? (
          <article className="service-record" key={selected.id}>
            <h2>{selected.customer}</h2>
            <p>{selected.request}</p>
            <p>
              Contact: {selected.contact || "Not recorded"} · Source:{" "}
              {selected.source}
            </p>
            <p>
              Revision {selected.revision} · Updated{" "}
              {new Date(selected.updatedAt).toLocaleString("en-US")}
            </p>
            <button onClick={exportRecord} disabled={busy}>
              Export inquiry record
            </button>
            <form
              className="mission-form"
              key={`status-${selected.status}`}
              onSubmit={(event) => {
                event.preventDefault();
                const fields = new FormData(event.currentTarget);
                void act({
                  action: "status",
                  revision: selected.revision,
                  status: fields.get("status") as Inquiry["status"],
                });
              }}
            >
              <label>
                Inquiry status
                <select
                  name="status"
                  defaultValue={selected.status}
                  disabled={disabled}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="won">Won (reported by owner)</option>
                  <option value="lost">Lost</option>
                </select>
              </label>
              <button disabled={disabled}>Save status</button>
            </form>
            <h3>Quote versions</h3>
            {quote ? (
              <div className="quote-preview">
                <button onClick={exportQuote} disabled={busy}>
                  Export current quote draft
                </button>
                <strong>{usd(quote.amountCents)}</strong>
                <p>{quote.scope}</p>
                <p>Price terms: {quote.pricingNotes}</p>
                <p>
                  {quote.approvedAt
                    ? "Owner-approved draft · not sent or accepted by customer"
                    : "Draft · owner review required"}
                </p>
                {!quote.approvedAt && (
                  <button
                    disabled={disabled}
                    onClick={() =>
                      void act({
                        action: "approve-quote",
                        revision: selected.revision,
                        quoteId: quote.id,
                      })
                    }
                  >
                    Approve current quote
                  </button>
                )}
                <details>
                  <summary>
                    Previous quote versions ({selected.quotes.length - 1})
                  </summary>
                  {selected.quotes.slice(0, -1).map((old, index) => (
                    <div key={old.id}>
                      <p>
                        Version {index + 1} · {usd(old.amountCents)} ·{" "}
                        {old.approvedAt ? "Previously approved" : "Draft"}
                      </p>
                      <p>{old.scope}</p>
                      <p>{old.pricingNotes}</p>
                    </div>
                  ))}
                </details>
              </div>
            ) : (
              <p>No quote yet. Define the scope and price below.</p>
            )}
            <form
              className="mission-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const fields = new FormData(form);
                void act({
                  action: "quote",
                  revision: selected.revision,
                  quoteId: crypto.randomUUID(),
                  scope: String(fields.get("scope")),
                  amountCents: Math.round(Number(fields.get("amount")) * 100),
                  pricingNotes: String(fields.get("pricingNotes")),
                }).then((saved) => {
                  if (saved) form.reset();
                });
              }}
            >
              <label>
                Proposed scope
                <textarea name="scope" required rows={3} maxLength={2000} />
              </label>
              <label>
                Proposed amount (USD)
                <input
                  name="amount"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Tax, fee and price terms
                <textarea
                  name="pricingNotes"
                  required
                  rows={2}
                  maxLength={500}
                />
              </label>
              <p>
                A new version always needs fresh owner approval. No tax is
                calculated automatically.
              </p>
              <button disabled={disabled}>Save new quote draft</button>
            </form>
            <h3>Follow-up tasks</h3>
            {selected.followUps.length === 0 && <p>No follow-ups scheduled.</p>}
            <ul>
              {[...selected.followUps]
                .sort((a, b) => a.due.localeCompare(b.due))
                .map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong> · {task.due} ·{" "}
                    {task.completedAt
                      ? "Completed"
                      : task.due < today()
                        ? "Overdue"
                        : task.due === today()
                          ? "Due today"
                          : "Scheduled"}{" "}
                    {!task.completedAt && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          void act({
                            action: "complete-follow-up",
                            revision: selected.revision,
                            taskId: task.id,
                          })
                        }
                      >
                        Complete: {task.title}
                      </button>
                    )}
                  </li>
                ))}
            </ul>
            <form
              className="mission-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const fields = new FormData(form);
                void act({
                  action: "follow-up",
                  revision: selected.revision,
                  taskId: crypto.randomUUID(),
                  title: String(fields.get("title")),
                  due: String(fields.get("due")),
                }).then((saved) => {
                  if (saved) form.reset();
                });
              }}
            >
              <label>
                Follow-up task
                <input name="title" required maxLength={400} />
              </label>
              <label>
                Due date
                <input name="due" type="date" defaultValue={today()} required />
              </label>
              <button disabled={disabled}>Add follow-up</button>
            </form>
            <details>
              <summary>Activity history ({selected.events.length})</summary>
              <ol>
                {selected.events.map((event, index) => (
                  <li key={index}>
                    {event.action.replaceAll("-", " ")} ·{" "}
                    {new Date(event.at).toLocaleString("en-US")}
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ) : loaded && inquiries.length > 0 ? (
          <p>Select an inquiry to review its quote and follow-ups.</p>
        ) : null}
      </div>
    </section>
  );
}
