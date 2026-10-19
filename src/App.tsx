import { lazy, Suspense, useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, Check, Orbit } from "lucide-react";

const Studio = lazy(() => import("./studio"));

type Session = { name: string; csrf: string };

const publicPlans = [
  {
    id: "observer",
    name: "Observer",
    price: 29,
    detail: "A disciplined start for individual research.",
    items: ["3 active strategies", "Paper ledger", "Weekly audit export"],
  },
  {
    id: "operator",
    name: "Operator",
    price: 99,
    detail: "The complete six-agent operating workflow.",
    items: [
      "Unlimited strategies",
      "Agent Operations V2",
      "Risk policy controls",
      "Priority onboarding",
    ],
  },
  {
    id: "desk",
    name: "Desk",
    price: 299,
    detail: "A shared control plane for small teams.",
    items: [
      "5 team seats",
      "Approval workflows",
      "API & webhooks",
      "Custom reporting",
    ],
  },
] as const;

function PricingPage() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const checkoutState = new URLSearchParams(window.location.search).get(
    "checkout",
  );
  useEffect(() => {
    fetch("/api/billing/config")
      .then((response) => response.json())
      .then((data: { enabled?: boolean }) => setEnabled(Boolean(data.enabled)))
      .catch(() => setEnabled(false));
  }, []);
  async function checkout(plan: (typeof publicPlans)[number]["id"]) {
    setBusy(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url)
        throw Error(data.error || "Checkout is unavailable");
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed");
      setBusy("");
    }
  }
  return (
    <main className="pricing-shell">
      <header className="pricing-header">
        <a href="/" className="pricing-brand">
          <Orbit size={24} /> ORBIT
        </a>
        <a href="/" className="ghost-button">
          Owner sign in
        </a>
      </header>
      <section className="pricing-hero">
        <p className="eyebrow">PRIVATE PAID BETA</p>
        <h1>Operate with evidence.</h1>
        <p>
          Six specialized agents challenge every strategy while risk gates,
          paper execution and an independent audit keep you in control.
        </p>
        <span>PAPER MODE · NO GUARANTEED RETURNS · CANCEL ANYTIME</span>
      </section>
      {checkoutState === "success" && (
        <p className="checkout-notice success">
          Checkout completed. ORBIT confirms payment and access only after a
          verified Stripe event; beta onboarding follows separately.
        </p>
      )}
      {checkoutState === "canceled" && (
        <p className="checkout-notice">
          Checkout canceled. Nothing was charged.
        </p>
      )}
      <section className="public-plan-grid" aria-label="ORBIT beta plans">
        {publicPlans.map((plan) => (
          <article
            className={plan.id === "operator" ? "featured" : ""}
            key={plan.id}
          >
            {plan.id === "operator" && (
              <span className="plan-ribbon">RECOMMENDED</span>
            )}
            <p className="eyebrow">{plan.name}</p>
            <h2>
              ${plan.price}
              <small>/month</small>
            </h2>
            <p>{plan.detail}</p>
            <ul>
              {plan.items.map((item) => (
                <li key={item}>
                  <Check size={14} /> {item}
                </li>
              ))}
            </ul>
            <button
              className="neon-button full"
              disabled={!enabled || Boolean(busy)}
              onClick={() => void checkout(plan.id)}
            >
              {busy === plan.id
                ? "Opening secure checkout…"
                : enabled
                  ? `Choose ${plan.name}`
                  : "Paid beta opening soon"}
            </button>
          </article>
        ))}
      </section>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <footer className="pricing-footer">
        ORBIT is decision-support software. It does not provide investment
        advice, custody assets or guarantee profits. Taxes may apply based on
        jurisdiction.
      </footer>
    </main>
  );
}

export default function App() {
  const [auth, setAuth] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/session")
      .then(async (r) => {
        if (r.ok) setAuth((await r.json()) as Session);
      })
      .catch(() =>
        setError(
          "The server is unreachable. Start the application server and retry.",
        ),
      )
      .finally(() => setReady(true));
    const expired = () => {
      setAuth(null);
      setError("Your session expired. Sign in again.");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = new FormData(e.currentTarget).get("password");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await r.json()) as Session & { error?: string };
      if (!r.ok) throw Error(data.error || "Unable to sign in");
      setAuth({ name: data.name, csrf: data.csrf });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      const r = await fetch("/api/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": auth!.csrf },
      });
      if (!r.ok) throw Error("Sign out failed");
      setAuth(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign out failed");
    }
  }
  if (window.location.pathname === "/pricing") return <PricingPage />;
  if (auth)
    return (
      <Suspense
        fallback={<div className="app-loading">Initializing ORBIT…</div>}
      >
        <Studio displayName={auth.name} csrf={auth.csrf} onLogout={logout} />
        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}
      </Suspense>
    );
  return (
    <div className="login-shell">
      <section className="login-art">
        <p className="eyebrow light">ORBIT / AGENTIC MARKET LAB</p>
        <h1>
          Autonomous insight.
          <br />
          <em>Human authority.</em>
        </h1>
        <p>
          Research, strategy, risk and simulation.
          <br />
          One auditable operating system.
        </p>
        <span className="login-monogram">O•</span>
        <small>PAPER MODE · LIVE EXECUTION LOCKED</small>
      </section>
      <section className="login-form">
        <div>
          <ShieldCheck size={30} />
          <p className="eyebrow">SECURE CONTROL PLANE</p>
          <h2>Enter ORBIT.</h2>
          <p>Authenticate to access your private agent network.</p>
          {!ready ? (
            <p>Checking your session…</p>
          ) : (
            <form onSubmit={login}>
              <label htmlFor="password">Owner password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={12}
                maxLength={512}
                required
                autoFocus
              />
              <button disabled={busy} className="btn primary full">
                {busy ? "Authenticating…" : "Open command center"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="fineprint">
            No wallet or exchange connection is enabled.
          </p>
        </div>
      </section>
    </div>
  );
}
