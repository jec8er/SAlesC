import { lazy, Suspense, useEffect, useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";

const Studio = lazy(() => import("./studio"));

type Session = { name: string; csrf: string };

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
