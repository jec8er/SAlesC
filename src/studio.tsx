"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Store,
  AudioLines,
  Users,
  Wallet,
  Settings,
  Download,
  X,
  Check,
  Trash2,
  Pencil,
  ShieldCheck,
  Mic,
  Square,
  Package,
  Cloud,
  AlertCircle,
  LogOut,
  Copy,
  Target,
  Atom,
  type LucideIcon,
} from "lucide-react";
import {
  type Workspace,
  type Business,
  type Product,
  type Deal,
  type Receipt,
  emptyWorkspace,
  metrics,
  moneyLabel,
  workspaceSchema,
  catalogHTML,
  proposalHTML,
  salesQueue,
  followUpText,
  outreachPack,
  orbitHandoff,
  orbitReadiness,
  scriptFor,
} from "../lib/domain";
type OrbitMemory = {
  schemaVersion: 1;
  preferences: Array<{
    area: "creative" | "quality" | "publishing" | "operations" | "commercial";
    key: string;
    value: string;
    updatedAt: string;
  }>;
  verifiedState: Array<{
    kind: "artifact" | "publication" | "quality" | "analytics" | "operation";
    statement: string;
    evidenceRef: string;
    observedAt: string;
  }>;
  nextActions: Array<{
    id: string;
    action: string;
    status: "pending" | "in_progress" | "blocked" | "done";
    updatedAt: string;
  }>;
};
type EntityKind = "business" | "product" | "deal" | "receipt";
type Entity = Business | Product | Deal | Receipt;
type ModalState = { kind: EntityKind; item?: Entity };
type View = (typeof nav)[number][0];
const playbook: ReadonlyArray<
  readonly [string, string, string, View, LucideIcon]
> = [
  [
    "01",
    "Build the storefront",
    "A clean catalog, real prices, direct order requests.",
    "commerce",
    Store,
  ],
  [
    "02",
    "Create the story",
    "A short script and an authentic voice recording.",
    "sound",
    AudioLines,
  ],
  [
    "03",
    "Close and measure",
    "A sales pipeline and a ledger of documented collections.",
    "pipeline",
    ArrowUpRight,
  ],
];

function upsert<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index >= 0) items[index] = item;
  else items.push(item);
}
const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["commerce", "Commerce", Store],
  ["sound", "SoundForge", AudioLines],
  ["pipeline", "Sales pipeline", Users],
  ["orbit", "ORBIT delivery", Atom],
  ["revenue", "Revenue ledger", Wallet],
  ["settings", "Settings", Settings],
] as const;
const stages = ["prospect", "contacted", "proposal", "won", "lost"] as const;
function download(content: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileName(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || "orbit";
}
function demo(): Workspace {
  return {
    businesses: [
      {
        id: "b1",
        name: "Casa Verde",
        category: "Independent café",
        phone: "12125550100",
        currency: "USD",
        description:
          "Small-batch coffee. Freshly baked mornings. A neighborhood ritual.",
      },
    ],
    products: [
      {
        id: "p1",
        businessId: "b1",
        name: "Morning ritual",
        description: "House coffee and a freshly baked pastry. Pickup only.",
        price: 12,
        cost: 4,
        stock: 30,
        image: "",
      },
      {
        id: "p2",
        businessId: "b1",
        name: "Weekend coffee box",
        description: "Six pastries and a bag of our house blend.",
        price: 38,
        cost: 16,
        stock: 8,
        image: "",
      },
    ],
    deals: [
      {
        id: "d1",
        name: "Example café owner",
        contact: "Illustrative prospect",
        stage: "won",
        value: 199,
        nextAction: "Review the catalog proposal",
        due: "",
        notes: "Demo data. Not a real customer.",
        businessId: "b1",
      },
      {
        id: "d2",
        name: "Example bakery",
        contact: "Illustrative prospect",
        stage: "contacted",
        value: 199,
        nextAction: "Ask about the current ordering process",
        due: "",
        notes: "Demo data. Not a real customer.",
      },
    ],
    receipts: [
      {
        id: "r1",
        label: "Example catalog setup",
        kind: "service",
        currency: "USD",
        gross: 199,
        cost: 40,
        fees: 6,
        refund: 0,
        status: "paid",
        reference: "DEMO ONLY",
        date: "2026-10-11",
        dealId: "d1",
      },
    ],
    settings: {
      setupPrice: 199,
      monthlyPrice: 39,
      target: 1000,
      currency: "USD",
      sellerName: "ORBIT",
      sellerPhone: "12125550100",
      sellerEmail: "owner@example.com",
      paymentLink: "",
      offerName: "Direct Commerce Launch",
      offerPromise:
        "A clear direct-order catalog, launch content and an owner handoff.",
      depositPercent: 50,
    },
  };
}
export default function Studio({
  displayName,
  csrf,
  onLogout,
}: {
  displayName: string;
  csrf: string;
  onLogout: () => void;
}) {
  const [w, setW] = useState<Workspace>(emptyWorkspace),
    [revision, setRevision] = useState(0),
    [view, setView] = useState<View>("overview"),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [isDemo, setDemo] = useState(false),
    [modal, setModal] = useState<ModalState | null>(null),
    [selected, setSelected] = useState(""),
    [scriptProduct, setScriptProduct] = useState(""),
    [lang, setLang] = useState("en"),
    [script, setScript] = useState(""),
    [orbitDealId, setOrbitDealId] = useState(""),
    [orbitRevision, setOrbitRevision] = useState(0),
    [orbitMemory, setOrbitMemory] = useState<OrbitMemory>({
      schemaVersion: 1,
      preferences: [],
      verifiedState: [],
      nextActions: [],
    }),
    [orbitLoaded, setOrbitLoaded] = useState(false),
    [recording, setRecording] = useState(false),
    [audioURL, setAudioURL] = useState("");
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    audioRef = useRef(""),
    saving = useRef(false);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/workspace");
      const data = (await r.json()) as {
        error?: string;
        workspace: Workspace;
        revision: number;
      };
      if (r.status === 401) window.dispatchEvent(new Event("session-expired"));
      if (!r.ok) throw Error(data.error || "Request failed");
      setW(workspaceSchema.parse(data.workspace));
      setRevision(data.revision);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load");
    }
  }
  useEffect(() => {
    load();
    return () => {
      recorder.current?.state === "recording" && recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (audioRef.current) URL.revokeObjectURL(audioRef.current);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function persist(next: Workspace) {
    if (saving.current) return false;
    const parsed = workspaceSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join("; "));
      return false;
    }
    if (isDemo) {
      setW(parsed.data);
      setToast("Demo updated — no real records changed");
      return true;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ workspace: parsed.data, revision }),
      });
      const data = (await r.json()) as {
        error?: string;
        workspace: Workspace;
        revision: number;
      };
      if (r.status === 401) window.dispatchEvent(new Event("session-expired"));
      if (!r.ok) throw Error(data.error || "Request failed");
      setW(data.workspace);
      setRevision(data.revision);
      setToast("Saved to your workspace");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function loadOrbit() {
    if (isDemo) {
      setOrbitLoaded(true);
      return;
    }
    try {
      const response = await fetch("/api/ecomoda/memory/orbit");
      const data = (await response.json()) as {
        error?: string;
        revision: number;
        memory: OrbitMemory;
      };
      if (response.status === 401)
        window.dispatchEvent(new Event("session-expired"));
      if (!response.ok) throw Error(data.error || "Unable to load ORBIT");
      setOrbitRevision(data.revision);
      setOrbitMemory(data.memory);
      setOrbitLoaded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load ORBIT");
    }
  }
  useEffect(() => {
    if (view === "orbit" && loaded) loadOrbit();
  }, [view, loaded, isDemo]);

  async function queueInOrbit(deal: Deal) {
    setOrbitDealId(deal.id);
    setView("orbit");
    if (isDemo) {
      setToast("Demo handoff prepared — no real records changed");
      return;
    }
    setBusy(true);
    try {
      let currentRevision = orbitRevision;
      let currentMemory = orbitMemory;
      if (!orbitLoaded) {
        const currentResponse = await fetch("/api/ecomoda/memory/orbit");
        const current = (await currentResponse.json()) as {
          error?: string;
          revision: number;
          memory: OrbitMemory;
        };
        if (!currentResponse.ok)
          throw Error(current.error || "Unable to load ORBIT");
        currentRevision = current.revision;
        currentMemory = current.memory;
      }
      const id = `fulfill-${deal.id}`
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .slice(0, 80);
      if (currentMemory.nextActions.some((action) => action.id === id)) {
        setOrbitMemory(currentMemory);
        setOrbitRevision(currentRevision);
        setOrbitLoaded(true);
        setToast("This opportunity is already in ORBIT delivery");
        return;
      }
      const memory: OrbitMemory = {
        ...currentMemory,
        nextActions: [
          ...currentMemory.nextActions,
          {
            id,
            action: `Prepare and verify the approved launch deliverables for ${deal.name}`,
            status: "pending",
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      const response = await fetch("/api/ecomoda/memory/orbit", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ revision: currentRevision, memory }),
      });
      const data = (await response.json()) as {
        error?: string;
        revision: number;
        memory: OrbitMemory;
      };
      if (!response.ok) throw Error(data.error || "Unable to queue ORBIT work");
      setOrbitMemory(data.memory);
      setOrbitRevision(data.revision);
      setOrbitLoaded(true);
      setToast("Opportunity handed to ORBIT delivery");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ORBIT handoff failed");
      await loadOrbit();
    } finally {
      setBusy(false);
    }
  }
  async function updateOrbitAction(
    id: string,
    status: OrbitMemory["nextActions"][number]["status"],
  ) {
    const memory: OrbitMemory = {
      ...orbitMemory,
      nextActions: orbitMemory.nextActions.map((action) =>
        action.id === id
          ? { ...action, status, updatedAt: new Date().toISOString() }
          : action,
      ),
    };
    if (isDemo) {
      setOrbitMemory(memory);
      setToast("Demo ORBIT status updated");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ecomoda/memory/orbit", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ revision: orbitRevision, memory }),
      });
      const data = (await response.json()) as {
        error?: string;
        revision: number;
        memory: OrbitMemory;
      };
      if (!response.ok) throw Error(data.error || "Unable to update ORBIT");
      setOrbitMemory(data.memory);
      setOrbitRevision(data.revision);
      setToast("ORBIT delivery status saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ORBIT update failed");
      await loadOrbit();
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.querySelector(".modal");
    const list = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,select,textarea",
        ) || [],
      );
    list()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        return;
      }
      if (e.key === "Tab") {
        const els = list();
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal?.kind, modal?.item?.id, busy]);
  const currency = w.settings.currency,
    m = metrics(w),
    fmt = (n: number, c = currency) => moneyLabel(n, c),
    business = w.businesses.find((b) => b.id === selected) || w.businesses[0],
    products = w.products.filter((p) => p.businessId === business?.id),
    queue = salesQueue(w),
    orbitDeal =
      w.deals.find((deal) => deal.id === orbitDealId) ||
      w.deals.find((deal) => deal.stage === "won") ||
      w.deals[0],
    orbitStatus = orbitDeal ? orbitReadiness(w, orbitDeal) : null;
  async function copyText(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setToast("Follow-up copied — review it before sending");
    } catch {
      download(content, "orbit-follow-up.txt");
      setToast("Clipboard unavailable — downloaded as text");
    }
  }
  function edit(kind: EntityKind, item?: Entity) {
    setError("");
    setModal({ kind, item });
  }
  async function remove(kind: EntityKind, id: string) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    const next = structuredClone(w);
    if (kind === "business") {
      next.businesses = next.businesses.filter((b) => b.id !== id);
      next.products = next.products.filter((p) => p.businessId !== id);
      next.deals = next.deals.map((deal) =>
        deal.businessId === id ? { ...deal, businessId: undefined } : deal,
      );
    } else if (kind === "product")
      next.products = next.products.filter((p) => p.id !== id);
    else if (kind === "deal") {
      next.deals = next.deals.filter((p) => p.id !== id);
      next.receipts = next.receipts.map((receipt) =>
        receipt.dealId === id ? { ...receipt, dealId: undefined } : receipt,
      );
    } else next.receipts = next.receipts.filter((p) => p.id !== id);
    await persist(next);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const f = new FormData(e.currentTarget),
      s = (key: string) => String(f.get(key) || ""),
      n = (key: string) => Number(f.get(key) || 0),
      id = modal.item?.id || crypto.randomUUID(),
      next = structuredClone(w);
    if (modal.kind === "business") {
      const item: Business = {
        id,
        name: s("name"),
        category: s("category"),
        phone: s("phone").replace(/[+\s()-]/g, ""),
        currency: s("currency") as Business["currency"],
        description: s("description"),
      };
      if (
        modal.item &&
        "currency" in modal.item &&
        modal.item.currency !== item.currency &&
        w.products.some((product) => product.businessId === id)
      ) {
        setError(
          "Remove the products before changing the business currency; amounts are not converted automatically.",
        );
        return;
      }
      upsert(next.businesses, item);
    } else if (modal.kind === "product") {
      if (!business) {
        setError("Add or select a business first.");
        return;
      }
      const item: Product = {
        id,
        businessId: business.id,
        name: s("name"),
        description: s("description"),
        price: n("price"),
        cost: n("cost"),
        stock: n("stock"),
        image: s("image"),
      };
      upsert(next.products, item);
    } else if (modal.kind === "deal") {
      const item: Deal = {
        id,
        name: s("name"),
        contact: s("contact"),
        stage: s("stage") as Deal["stage"],
        value: n("value"),
        nextAction: s("nextAction"),
        due: s("due"),
        notes: s("notes"),
        source: s("source") as Deal["source"],
        priority: s("priority") as Deal["priority"],
        lastContact: s("lastContact"),
        objection: s("objection"),
        businessId: s("businessId") || undefined,
      };
      upsert(next.deals, item);
    } else {
      const item: Receipt = {
        id,
        label: s("label"),
        kind: s("kind") as Receipt["kind"],
        currency: s("currency") as Receipt["currency"],
        gross: n("gross"),
        cost: n("cost"),
        fees: n("fees"),
        refund: n("refund"),
        status: s("status") as Receipt["status"],
        reference: s("reference"),
        date: s("date"),
        dealId: s("dealId") || undefined,
      };
      upsert(next.receipts, item);
    }
    if (await persist(next)) setModal(null);
  }
  async function requestDeposit(deal: Deal) {
    const existing = w.receipts.find((receipt) => receipt.dealId === deal.id);
    if (existing) {
      setView("revenue");
      setToast(
        existing.status === "paid"
          ? "A verified payment is already linked to this opportunity"
          : "A payment request is already linked to this opportunity",
      );
      return;
    }
    if (deal.stage !== "won") {
      setError("Mark the opportunity won before requesting a deposit.");
      return;
    }
    const percent = w.settings.depositPercent ?? 50;
    const amount = Math.round(deal.value * percent) / 100;
    if (amount <= 0) {
      setError(
        "Set a positive opportunity value and deposit percentage first.",
      );
      return;
    }
    const next = structuredClone(w);
    next.receipts.push({
      id: crypto.randomUUID(),
      label: `${percent}% deposit · ${deal.name}`,
      kind: "service",
      currency: w.settings.currency,
      gross: amount,
      cost: 0,
      fees: 0,
      refund: 0,
      status: "pending",
      reference: "",
      date: new Intl.DateTimeFormat("en-CA").format(new Date()),
      dealId: deal.id,
    });
    if (await persist(next)) {
      setView("revenue");
      setToast(
        `Deposit due created for ${moneyLabel(amount, w.settings.currency)}`,
      );
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error("Audio recording is not supported in this browser.");
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const chunks: BlobPart[] = [];
      recorder.current = new MediaRecorder(stream.current);
      recorder.current.ondataavailable = (e) => chunks.push(e.data);
      recorder.current.onstop = () => {
        if (audioRef.current) URL.revokeObjectURL(audioRef.current);
        const url = URL.createObjectURL(
          new Blob(chunks, {
            type: recorder.current?.mimeType || "audio/webm",
          }),
        );
        audioRef.current = url;
        setAudioURL(url);
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.current.start();
      setRecording(true);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(e instanceof Error ? e.message : "Microphone access failed");
    }
  }
  const Empty = ({
    title,
    detail,
    action,
    label,
  }: {
    title: string;
    detail: string;
    action?: () => void;
    label?: string;
  }) => (
    <div className="empty">
      <Package size={32} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && (
        <button className="btn primary" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
  const modalValue = (name: string) => {
    if (!modal?.item) return undefined;
    return (modal.item as unknown as Record<string, unknown>)[name];
  };
  const inputValue = (name: string) => {
    const value = modalValue(name);
    return typeof value === "string" || typeof value === "number"
      ? value
      : undefined;
  };
  const Field = ({
    name,
    label,
    type = "text",
    required = false,
    options,
    min,
  }: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    options?: string[];
    min?: number;
  }) => (
    <label className={type === "textarea" ? "span2" : ""}>
      {label}
      {options ? (
        <select
          name={name}
          defaultValue={String(modalValue(name) || options[0])}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          maxLength={name === "notes" ? 1000 : name === "objection" ? 400 : 600}
          defaultValue={String(modalValue(name) || "")}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          min={min}
          maxLength={180}
          step={
            type === "number" ? (name === "stock" ? "1" : "0.01") : undefined
          }
          defaultValue={
            inputValue(name) ??
            (name === "date"
              ? new Date().toISOString().slice(0, 10)
              : name === "value"
                ? w.settings.setupPrice
                : "")
          }
        />
      )}
    </label>
  );
  return (
    <div className="shell">
      <a className="skip-link" href="#workspace-content">
        Skip to workspace content
      </a>
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
        >
          <span className="brandmark">
            O<span>•</span>
          </span>
          <span>
            ORBIT<small>PRIVATE BUSINESS OS</small>
          </span>
        </a>
        <div className="nav-label">YOUR BUSINESS, CONNECTED</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
              {id === "sound" && <span className="tag">STUDIO</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="integration">
            <span className="dot" />
            Three ideas. One operating system.
            <small>Commerce × Content × Revenue</small>
          </div>
          <div className="user">
            <span className="avatar">J</span>
            <div>
              {displayName.split("@")[0]}
              <small>Owner · jec8er</small>
            </div>
            <ShieldCheck size={18} />
            <button
              className="signout"
              onClick={onLogout}
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <main id="workspace-content" tabIndex={-1}>
        <header>
          <span className="breadcrumb">
            Workspace <span>/</span> {nav.find((n) => n[0] === view)?.[1]}
          </span>
          <div className="header-right">
            <span className="status">
              <Cloud size={14} />
              {isDemo
                ? "DEMO MODE"
                : busy
                  ? "SAVING…"
                  : loaded
                    ? "SERVER CONNECTED"
                    : "CONNECTING…"}
            </span>
            <button
              className="btn small"
              disabled={busy}
              onClick={() => {
                if (isDemo) {
                  setDemo(false);
                  load();
                } else {
                  setDemo(true);
                  setW(demo());
                  setSelected("b1");
                }
              }}
            >
              {isDemo ? "Exit demo" : "Explore demo"}
            </button>
          </div>
        </header>
        <div className="content">
          {isDemo && (
            <div className="notice demo">
              <AlertCircle size={17} />
              Illustrative demo. All customers, sales and earnings below are
              fictional.
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button onClick={() => load()}>Reload saved data</button>
            </div>
          )}
          {!loaded && !isDemo ? (
            <Empty
              title="Opening your workspace"
              detail="Your records are protected by owner sign-in."
            />
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="page-title">
                    <div>
                      <p className="eyebrow">
                        THE BUSINESS OF BUILDING SOMETHING
                      </p>
                      <h1>
                        Good craft.
                        <br />
                        <em>Better business.</em>
                      </h1>
                      <p className="subtitle">
                        Turn a product into a storefront. A storefront into a
                        story.
                        <br />A story into a sale you can actually measure.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => edit("business")}
                    >
                      <Plus size={18} />
                      Create a business
                    </button>
                  </div>
                  <section className="hero">
                    <div>
                      <span className="eyebrow light">YOUR NEXT MOVE</span>
                      <h2>
                        Start with one business.
                        <br />
                        Make the first sale count.
                      </h2>
                      <p>
                        Build a direct-order catalog and a launch kit.
                        <br />
                        Track the opportunity through to a documented payment.
                      </p>
                      <button
                        className="btn cream"
                        onClick={() =>
                          setView(w.businesses.length ? "commerce" : "pipeline")
                        }
                      >
                        Open your playbook <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit o1" />
                      <div className="orbit o2" />
                      <div className="art-label">
                        FROM CRAFT
                        <br />
                        TO COMMERCE
                      </div>
                      <span className="art-s">S</span>
                      <span className="art-arrow">↗</span>
                      <span className="art-foot">
                        A LITTLE MORE INDEPENDENT.
                      </span>
                    </div>
                  </section>
                  <div className="stats">
                    {[
                      [
                        "Collected revenue",
                        fmt(m.collected),
                        "Payments with a recorded reference",
                      ],
                      [
                        "Contribution margin",
                        fmt(m.margin),
                        "After costs, fees and refunds",
                      ],
                      [
                        "Active opportunities",
                        String(
                          w.deals.filter(
                            (d) => !["won", "lost"].includes(d.stage),
                          ).length,
                        ),
                        "Prospects are not revenue",
                      ],
                      [
                        "Businesses",
                        String(w.businesses.length),
                        "Your catalogs, ready to build",
                      ],
                    ].map(([label, value, note]) => (
                      <div className="stat" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{note}</small>
                      </div>
                    ))}
                  </div>
                  <div className="section-heading">
                    <h2>Your revenue playbook</h2>
                    <span>ONE FOCUSED OFFER. THREE CONNECTED STEPS.</span>
                  </div>
                  <div className="playbook">
                    {playbook.map(([step, title, desc, target, CardIcon]) => {
                      return (
                        <button
                          className="play-card"
                          key={step}
                          onClick={() => setView(target)}
                        >
                          <span className="step">
                            {step}
                            <CardIcon size={22} />
                          </span>
                          <h3>{title}</h3>
                          <p>{desc}</p>
                          <span className="card-link">
                            Let's make it happen <ArrowUpRight size={16} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <section className="offer">
                    <div>
                      <p className="eyebrow">FIRST OFFER TO TEST</p>
                      <h2>The Direct Commerce Launch</h2>
                      <p>
                        Catalog setup, direct-order flow, 3 launch scripts and
                        one handoff session.
                        <br />
                        An initial offer hypothesis — validate it with paying
                        customers.
                      </p>
                    </div>
                    <div>
                      <strong>{fmt(w.settings.setupPrice)}</strong>
                      <small>suggested setup price</small>
                      <span>
                        {fmt(w.settings.monthlyPrice)} / month for updates, if
                        agreed
                      </span>
                    </div>
                  </section>
                </>
              )}
              {view === "commerce" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">ORBIT / DIRECT COMMERCE</p>
                      <h1>Your storefronts.</h1>
                      <p>
                        Real products. Clear prices. Orders that reach the
                        business.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => edit("business")}
                    >
                      <Plus size={17} />
                      Add business
                    </button>
                  </div>
                  {!business ? (
                    <Empty
                      title="Your first catalog starts here"
                      detail="Add a business and its real WhatsApp number. No restaurants or products are preloaded."
                      action={() => edit("business")}
                      label="Add a business"
                    />
                  ) : (
                    <>
                      <div className="toolbar">
                        <select
                          aria-label="Select business"
                          value={business.id}
                          onChange={(e) => setSelected(e.target.value)}
                        >
                          {w.businesses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          onClick={() => edit("business", business)}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button
                          className="btn"
                          onClick={() => remove("business", business.id)}
                          aria-label="Delete business"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          className="btn primary"
                          disabled={!products.length}
                          onClick={() =>
                            download(
                              catalogHTML(business, products),
                              `${fileName(business.name)}-catalog.html`,
                              "text/html",
                            )
                          }
                        >
                          <Download size={16} />
                          Export customer catalog
                        </button>
                      </div>
                      <div className="business-head">
                        <span className="roundicon">
                          <Store />
                        </span>
                        <div>
                          <h2>{business.name}</h2>
                          <p>{business.description}</p>
                          <span>
                            {business.category} · {business.currency} · +
                            {business.phone}
                          </span>
                        </div>
                      </div>
                      <div className="notice">
                        Catalog exports include a customer cart and prepare one
                        complete WhatsApp request. Availability, delivery and
                        payment must still be confirmed by the business. This
                        workspace stays private.
                      </div>
                      <div className="section-heading">
                        <h2>
                          Products <small>({products.length})</small>
                        </h2>
                        <button className="btn" onClick={() => edit("product")}>
                          <Plus size={16} />
                          Add product
                        </button>
                      </div>
                      {!products.length ? (
                        <Empty
                          title="Add what this business really sells"
                          detail="Include cost and available quantity to evaluate contribution margin."
                          action={() => edit("product")}
                          label="Add product"
                        />
                      ) : (
                        <div className="product-grid">
                          {products.map((p) => (
                            <article className="product" key={p.id}>
                              <div className="product-image">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} />
                                ) : (
                                  <>
                                    <Package size={48} />
                                    <span>{p.name}</span>
                                  </>
                                )}
                                <span className="stock">
                                  {p.stock > 0
                                    ? `${p.stock} available`
                                    : "Unavailable"}
                                </span>
                              </div>
                              <div className="product-body">
                                <h3>{p.name}</h3>
                                <p>{p.description}</p>
                                <div className="product-price">
                                  <strong>
                                    {fmt(p.price, business.currency)}
                                  </strong>
                                  <span>
                                    {p.price
                                      ? Math.round(
                                          ((p.price - p.cost) / p.price) * 100,
                                        )
                                      : 0}
                                    % gross margin
                                  </span>
                                </div>
                                <div className="actions">
                                  <button
                                    className="btn small"
                                    onClick={() => edit("product", p)}
                                  >
                                    <Pencil size={14} />
                                    Edit
                                  </button>
                                  <button
                                    className="btn small"
                                    onClick={() => remove("product", p.id)}
                                    aria-label={`Delete ${p.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {view === "sound" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">SOUNDFORGE / CONTENT STUDIO</p>
                      <h1>Give your business a voice.</h1>
                      <p>
                        A useful script. A real voice. One clear call to action.
                      </p>
                    </div>
                    <span className="pill">
                      Template-assisted · no AI connection
                    </span>
                  </div>
                  <div className="studio-grid">
                    <section className="panel">
                      <span className="eyebrow">01 / THE BRIEF</span>
                      <h2>Make a launch script</h2>
                      <label>
                        Business
                        <select
                          value={business?.id || ""}
                          onChange={(e) => setSelected(e.target.value)}
                        >
                          <option value="" disabled>
                            Select a business
                          </option>
                          {w.businesses.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Product
                        <select
                          value={scriptProduct}
                          onChange={(e) => setScriptProduct(e.target.value)}
                        >
                          <option value="">Select a product</option>
                          {products.map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Language
                        <select
                          value={lang}
                          onChange={(e) => setLang(e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                        </select>
                      </label>
                      <button
                        className="btn primary full"
                        disabled={!products.length}
                        onClick={() => {
                          const p = products.find(
                            (p) => p.id === scriptProduct,
                          );
                          if (!p || !business) {
                            setError("Select a product first");
                            return;
                          }
                          setScript(scriptFor(business, p, lang));
                        }}
                      >
                        Prepare script <ArrowRight size={16} />
                      </button>
                      <p className="fineprint">
                        Templates use your supplied product facts. Review every
                        claim before publishing.
                      </p>
                    </section>
                    <section className="panel script-panel">
                      <div className="section-heading">
                        <span className="eyebrow">02 / YOUR SCRIPT</span>
                        <span className="pill">
                          {script.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        aria-label="Editable launch script"
                        placeholder="Select a business and product to begin. You can edit the script here."
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        maxLength={10000}
                      />
                      <button
                        className="btn"
                        disabled={!script.trim()}
                        onClick={() => download(script, "launch-script.txt")}
                      >
                        <Download size={16} />
                        Download script
                      </button>
                      <p className="fineprint">
                        Scripts stay in this tab until downloaded.
                      </p>
                    </section>
                  </div>
                  <section className="record-panel">
                    <div>
                      <span className="eyebrow">03 / RECORD THE STORY</span>
                      <h2>Sound human. Because you are.</h2>
                      <p>
                        Record locally with your microphone. Audio is kept in
                        this tab until downloaded.
                      </p>
                    </div>
                    <div>
                      <button
                        className={`btn ${recording ? "danger" : "primary"}`}
                        onClick={record}
                      >
                        {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
                        {recording ? "Stop recording" : "Record voice"}
                      </button>
                      {audioURL && (
                        <>
                          <audio controls src={audioURL} />
                          <a
                            className="btn"
                            href={audioURL}
                            download={
                              recorder.current?.mimeType.includes("mp4")
                                ? "voiceover.mp4"
                                : "voiceover.webm"
                            }
                          >
                            <Download size={16} />
                            Download audio
                          </a>
                        </>
                      )}
                    </div>
                  </section>
                  <div className="notice">
                    Nothing is posted automatically. Export a customer catalog,
                    script and recording to deliver your launch kit.
                  </div>
                </>
              )}
              {view === "pipeline" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">FROM CONVERSATION TO CUSTOMER</p>
                      <h1>Every sale starts somewhere.</h1>
                      <p>
                        Record only real prospects. Keep the next action
                        visible.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => edit("deal")}
                    >
                      <Plus size={16} />
                      Add opportunity
                    </button>
                  </div>
                  <div className="notice">
                    Opportunity values use {currency}. A won opportunity is not
                    collected revenue; record the payment separately.
                  </div>
                  <section className="close-desk">
                    <div className="close-desk-head">
                      <div>
                        <p className="eyebrow">CLOSE DESK / TODAY</p>
                        <h2>Do the next revenue action.</h2>
                        <p>
                          Ordered by overdue follow-up, due date and priority.
                          Readiness measures record completeness—not win
                          probability.
                        </p>
                      </div>
                      <Target size={34} />
                    </div>
                    {!queue.length ? (
                      <p className="queue-empty">
                        Add a real opportunity to build today’s action queue.
                      </p>
                    ) : (
                      <div className="action-queue">
                        {queue
                          .slice(0, 5)
                          .map(({ deal, score, overdue, missing }) => (
                            <article key={deal.id}>
                              <div className="queue-rank">{score}</div>
                              <div className="queue-main">
                                <strong>{deal.name}</strong>
                                <span>
                                  {overdue
                                    ? `Overdue · ${deal.due}`
                                    : deal.due
                                      ? `Due ${deal.due}`
                                      : "No follow-up date"}
                                  {` · ${deal.priority || "medium"} priority`}
                                </span>
                                <p>
                                  {deal.nextAction ||
                                    `Add ${missing.join(" and ") || "a next action"}`}
                                </p>
                              </div>
                              <div className="queue-actions">
                                <button
                                  className="btn small"
                                  onClick={() =>
                                    copyText(followUpText(deal, w.settings))
                                  }
                                >
                                  <Copy size={14} /> Copy message
                                </button>
                                <button
                                  className="btn small"
                                  onClick={() =>
                                    download(
                                      outreachPack(deal, w.settings),
                                      `${fileName(deal.name)}-follow-up-pack.txt`,
                                    )
                                  }
                                >
                                  <Download size={14} /> 3-touch pack
                                </button>
                              </div>
                            </article>
                          ))}
                      </div>
                    )}
                  </section>
                  <div className="kanban">
                    {stages.map((stage) => (
                      <section key={stage}>
                        <div className="column-title">
                          {stage}
                          <span>
                            {w.deals.filter((d) => d.stage === stage).length}
                          </span>
                        </div>
                        {w.deals
                          .filter((d) => d.stage === stage)
                          .map((d) => (
                            <article className="deal" key={d.id}>
                              <button
                                className="deal-title"
                                onClick={() => edit("deal", d)}
                              >
                                {d.name}
                                <ArrowUpRight size={14} />
                              </button>
                              <p>{d.contact || "Contact not recorded"}</p>
                              <strong>{fmt(d.value)}</strong>
                              <div className="next-action">
                                {d.nextAction || "Add a next action"}
                                {d.due && <small>Due {d.due}</small>}
                              </div>
                              <select
                                aria-label={`Stage for ${d.name}`}
                                value={d.stage}
                                disabled={busy}
                                onChange={(e) =>
                                  persist({
                                    ...w,
                                    deals: w.deals.map((x) =>
                                      x.id === d.id
                                        ? {
                                            ...x,
                                            stage: e.target
                                              .value as (typeof stages)[number],
                                          }
                                        : x,
                                    ),
                                  })
                                }
                              >
                                {stages.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                              <div className="deal-actions">
                                <button
                                  className="text-btn"
                                  onClick={() =>
                                    download(
                                      proposalHTML(
                                        w.businesses.find(
                                          (item) => item.id === d.businessId,
                                        ) || null,
                                        d,
                                        w.settings,
                                      ),
                                      `${fileName(d.name)}-proposal.html`,
                                      "text/html",
                                    )
                                  }
                                >
                                  <Download size={13} /> Draft proposal
                                </button>
                                {d.stage === "won" && (
                                  <button
                                    className="text-btn"
                                    onClick={() => requestDeposit(d)}
                                  >
                                    <Wallet size={13} />
                                    {w.receipts.some(
                                      (receipt) => receipt.dealId === d.id,
                                    )
                                      ? "View payment"
                                      : "Create deposit due"}
                                  </button>
                                )}
                                <button
                                  className="text-btn"
                                  onClick={() => {
                                    setOrbitDealId(d.id);
                                    setView("orbit");
                                  }}
                                >
                                  <Atom size={13} /> Open in ORBIT
                                </button>
                                <button
                                  className="text-btn danger-text"
                                  onClick={() => remove("deal", d.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </article>
                          ))}
                        {!w.deals.some((d) => d.stage === stage) && (
                          <p className="column-empty">No opportunities yet.</p>
                        )}
                      </section>
                    ))}
                  </div>
                  <section className="panel sales-note">
                    <h2>The first customer playbook</h2>
                    <ol>
                      <li>
                        Choose one business you can reach, with a real product
                        and a working fulfillment process.
                      </li>
                      <li>
                        Ask how orders arrive today, where buyers drop off and
                        who approves a paid setup.
                      </li>
                      <li>
                        Build a small catalog from approved facts. Show the
                        owner the complete customer journey.
                      </li>
                      <li>
                        Agree scope, price, delivery date and payment terms
                        before doing the full launch.
                      </li>
                      <li>
                        Deliver the files, test a real order request, and record
                        the payment reference.
                      </li>
                    </ol>
                    <p>
                      No demand, conversion or revenue is assumed. This is the
                      motion to test.
                    </p>
                  </section>
                </>
              )}
              {view === "orbit" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">SALES → DELIVERY / ONE SYSTEM</p>
                      <h1>ORBIT fulfills what you sold.</h1>
                      <p>
                        Turn an approved opportunity into controlled production,
                        review and delivery without copying client data between
                        tools.
                      </p>
                    </div>
                    {orbitDeal && (
                      <button
                        className="btn primary"
                        disabled={!orbitStatus?.ready}
                        onClick={() =>
                          download(
                            orbitHandoff(w, orbitDeal),
                            `${fileName(orbitDeal.name)}-orbit-handoff.txt`,
                          )
                        }
                      >
                        <Download size={16} /> Export handoff
                      </button>
                    )}
                  </div>
                  <div className="notice">
                    ORBIT is part of this private workspace. It does not
                    publish, contact customers or confirm revenue automatically.
                  </div>
                  {!w.deals.length ? (
                    <Empty
                      title="Close an opportunity first"
                      detail="Add the opportunity in Sales pipeline, link its business and return here for delivery."
                      action={() => setView("pipeline")}
                      label="Open sales pipeline"
                    />
                  ) : (
                    <>
                      <div className="toolbar">
                        <label className="orbit-picker">
                          Opportunity
                          <select
                            value={orbitDeal?.id || ""}
                            onChange={(event) =>
                              setOrbitDealId(event.target.value)
                            }
                          >
                            {w.deals.map((deal) => (
                              <option key={deal.id} value={deal.id}>
                                {deal.name} · {deal.stage}
                              </option>
                            ))}
                          </select>
                        </label>
                        {orbitDeal && (
                          <button
                            className="btn"
                            disabled={busy || !orbitStatus?.ready}
                            onClick={() => queueInOrbit(orbitDeal)}
                          >
                            <Atom size={16} /> Add to delivery queue
                          </button>
                        )}
                      </div>
                      {orbitDeal && orbitStatus && (
                        <div className="orbit-grid">
                          <section className="panel orbit-readiness">
                            <p className="eyebrow">DELIVERY READINESS</p>
                            <div className="orbit-score">
                              <strong>{orbitStatus.score}</strong>
                              <span>/ 100</span>
                            </div>
                            <h2>
                              {orbitStatus.ready
                                ? "Ready for controlled production"
                                : "Complete the commercial handoff"}
                            </h2>
                            {orbitStatus.blockers.length ? (
                              <ul>
                                {orbitStatus.blockers.map((blocker) => (
                                  <li key={blocker}>{blocker}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>
                                Won deal, linked business, approved scope,
                                product facts and verified payment are present.
                              </p>
                            )}
                            <button
                              className="btn"
                              onClick={() => edit("deal", orbitDeal)}
                            >
                              <Pencil size={15} /> Edit handoff inputs
                            </button>
                            {orbitDeal.stage === "won" &&
                              orbitStatus.collected <= 0 && (
                                <button
                                  className="btn"
                                  onClick={() => requestDeposit(orbitDeal)}
                                >
                                  <Wallet size={15} /> Create deposit due
                                </button>
                              )}
                          </section>
                          <section className="panel">
                            <p className="eyebrow">SHARED COMMERCIAL CONTEXT</p>
                            <h2>{orbitDeal.name}</h2>
                            <div className="source-row">
                              <Check size={16} />
                              {orbitStatus.business?.name ||
                                "Business not linked"}
                            </div>
                            <div className="source-row">
                              <Check size={16} />
                              {orbitStatus.products.length} approved product
                              {orbitStatus.products.length === 1 ? "" : "s"}
                            </div>
                            <div className="source-row">
                              <Check size={16} />
                              {fmt(orbitDeal.value)} agreed opportunity value
                            </div>
                            <div className="source-row">
                              <Check size={16} />
                              {fmt(orbitStatus.collected)} verified and linked
                            </div>
                            <p className="fineprint">
                              Revenue is counted only after a payment is
                              recorded in the ledger.
                            </p>
                          </section>
                        </div>
                      )}
                      <section className="close-desk orbit-queue">
                        <div className="close-desk-head">
                          <div>
                            <p className="eyebrow">ORBIT / DELIVERY QUEUE</p>
                            <h2>One queue from sale to handoff.</h2>
                          </div>
                          <Atom size={34} />
                        </div>
                        {!orbitLoaded ? (
                          <p className="queue-empty">Loading ORBIT delivery…</p>
                        ) : !orbitMemory.nextActions.length ? (
                          <p className="queue-empty">
                            No delivery work yet. Choose an opportunity above.
                          </p>
                        ) : (
                          <div className="action-queue">
                            {orbitMemory.nextActions.map((action) => (
                              <article key={action.id}>
                                <div className="queue-rank">
                                  {action.status === "done" ? (
                                    <Check size={18} />
                                  ) : (
                                    <Atom size={18} />
                                  )}
                                </div>
                                <div className="queue-main">
                                  <strong>{action.action}</strong>
                                  <span>{action.status.replace("_", " ")}</span>
                                </div>
                                <select
                                  aria-label={`Status for ${action.action}`}
                                  value={action.status}
                                  disabled={busy}
                                  onChange={(event) =>
                                    updateOrbitAction(
                                      action.id,
                                      event.target
                                        .value as OrbitMemory["nextActions"][number]["status"],
                                    )
                                  }
                                >
                                  <option value="pending">pending</option>
                                  <option value="in_progress">
                                    in progress
                                  </option>
                                  <option value="blocked">blocked</option>
                                  <option value="done">done</option>
                                </select>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </>
              )}
              {view === "revenue" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">MEASURE WHAT ACTUALLY ARRIVED</p>
                      <h1>Revenue, without the fiction.</h1>
                      <p>
                        Manual ledger. Payment references documented by you.
                      </p>
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => edit("receipt")}
                    >
                      <Plus size={16} />
                      Record payment
                    </button>
                  </div>
                  <div className="stats three">
                    {[
                      ["Collected", m.collected],
                      ["Contribution margin", m.margin],
                      ["Awaiting payment", m.pending],
                    ].map(([label, value]) => (
                      <div className="stat" key={label}>
                        <span>{label}</span>
                        <strong>{fmt(Number(value))}</strong>
                        <small>{currency} only · not a forecast</small>
                      </div>
                    ))}
                  </div>
                  <div className="notice">
                    A payment reference supports your record; it is not
                    independent processor verification. Costs include your
                    delivery costs and labor. Taxes are not calculated.
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Payment</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Net collected</th>
                          <th>Contribution</th>
                          <th>Reference</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {w.receipts.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.label}</strong>
                              <small>
                                {r.kind} · {r.currency}
                                {r.dealId
                                  ? ` · ${w.deals.find((deal) => deal.id === r.dealId)?.name || "linked opportunity"}`
                                  : ""}
                              </small>
                            </td>
                            <td>{r.date}</td>
                            <td>
                              <span
                                className={`pill ${r.status === "paid" ? "green" : ""}`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td>
                              {fmt(
                                r.status === "pending" ? 0 : r.gross - r.refund,
                                r.currency,
                              )}
                            </td>
                            <td>
                              {fmt(
                                r.status === "pending"
                                  ? 0
                                  : r.gross - r.refund - r.cost - r.fees,
                                r.currency,
                              )}
                            </td>
                            <td>{r.reference || "—"}</td>
                            <td>
                              <button
                                className="icon-btn"
                                aria-label={`Edit ${r.label}`}
                                onClick={() => edit("receipt", r)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="icon-btn"
                                aria-label={`Delete ${r.label}`}
                                onClick={() => remove("receipt", r.id)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!w.receipts.length && (
                      <Empty
                        title="No collections recorded"
                        detail="Add a payment only when you have its amount, costs and actual status."
                      />
                    )}
                  </div>
                  <div className="goal">
                    <div>
                      <span className="eyebrow">YOUR COLLECTION TARGET</span>
                      <strong>
                        {fmt(m.collected)}{" "}
                        <small>of {fmt(w.settings.target)}</small>
                      </strong>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, w.settings.target ? (m.collected / w.settings.target) * 100 : 0))}%`,
                        }}
                      />
                    </div>
                    <p>
                      {w.settings.target
                        ? Math.max(
                            0,
                            Math.ceil(
                              (w.settings.target - m.collected) /
                                Math.max(1, w.settings.setupPrice),
                            ),
                          )
                        : 0}{" "}
                      setups at your suggested price to reach the remaining
                      gross collection target. This is arithmetic, not predicted
                      demand.
                    </p>
                  </div>
                </>
              )}
              {view === "settings" && (
                <>
                  <div className="section-title">
                    <div>
                      <p className="eyebrow">
                        A BUSINESS BUILT ON CLEAR ASSUMPTIONS
                      </p>
                      <h1>Your operating settings.</h1>
                      <p>
                        Change the offer, protect your work and keep the numbers
                        honest.
                      </p>
                    </div>
                  </div>
                  <div className="studio-grid">
                    <section className="panel">
                      <h2>Your offer hypothesis</h2>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          const c = String(f.get("currency")) as "USD" | "COP";
                          if (c !== currency && w.deals.length) {
                            setError(
                              "Resolve or remove opportunity records before changing their currency. Values are not converted automatically.",
                            );
                            return;
                          }
                          await persist({
                            ...w,
                            settings: {
                              ...w.settings,
                              setupPrice: Number(f.get("setupPrice")),
                              monthlyPrice: Number(f.get("monthlyPrice")),
                              target: Number(f.get("target")),
                              currency: c,
                              sellerName: String(f.get("sellerName") || ""),
                              sellerPhone: String(
                                f.get("sellerPhone") || "",
                              ).replace(/[+\s()-]/g, ""),
                              sellerEmail: String(f.get("sellerEmail") || ""),
                              paymentLink: String(f.get("paymentLink") || ""),
                              offerName: String(f.get("offerName") || ""),
                              offerPromise: String(f.get("offerPromise") || ""),
                              depositPercent: Number(f.get("depositPercent")),
                            },
                          });
                        }}
                      >
                        <label>
                          Reporting currency
                          <select
                            name="currency"
                            defaultValue={currency}
                            key={currency}
                          >
                            <option>USD</option>
                            <option>COP</option>
                          </select>
                        </label>
                        {[
                          ["setupPrice", "Setup price"],
                          ["monthlyPrice", "Monthly updates price"],
                          ["target", "Collection target"],
                        ].map(([key, label]) => (
                          <label key={key}>
                            {label}
                            <input
                              name={key}
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              defaultValue={w.settings[key as "target"]}
                            />
                          </label>
                        ))}
                        <label>
                          Seller / studio name
                          <input
                            name="sellerName"
                            maxLength={180}
                            defaultValue={w.settings.sellerName || ""}
                          />
                        </label>
                        <label>
                          WhatsApp number
                          <input
                            name="sellerPhone"
                            maxLength={30}
                            placeholder="Country code + number"
                            defaultValue={w.settings.sellerPhone || ""}
                          />
                        </label>
                        <label>
                          Seller email
                          <input
                            name="sellerEmail"
                            type="email"
                            maxLength={254}
                            defaultValue={w.settings.sellerEmail || ""}
                          />
                        </label>
                        <label>
                          Secure deposit link (optional)
                          <input
                            name="paymentLink"
                            type="url"
                            placeholder="https://"
                            maxLength={2000}
                            defaultValue={w.settings.paymentLink || ""}
                          />
                        </label>
                        <label>
                          Offer name
                          <input
                            name="offerName"
                            maxLength={180}
                            defaultValue={
                              w.settings.offerName || "Direct Commerce Launch"
                            }
                          />
                        </label>
                        <label>
                          Proposed deposit (%)
                          <input
                            name="depositPercent"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            defaultValue={w.settings.depositPercent ?? 50}
                          />
                        </label>
                        <label>
                          Offer outcome
                          <textarea
                            name="offerPromise"
                            maxLength={400}
                            defaultValue={w.settings.offerPromise || ""}
                          />
                        </label>
                        <button disabled={busy} className="btn primary">
                          Save assumptions
                        </button>
                      </form>
                      <p className="fineprint">
                        These are proposed prices. No subscriptions or payment
                        charges are created.
                      </p>
                    </section>
                    <section className="panel">
                      <h2>Your data, under your control</h2>
                      <p>
                        Business, pipeline and ledger records are stored in your
                        private server workspace. Audio and scripts must be
                        downloaded separately.
                      </p>
                      <button
                        className="btn"
                        onClick={() =>
                          download(
                            JSON.stringify(w, null, 2),
                            "orbit-workspace.json",
                            "application/json",
                          )
                        }
                      >
                        <Download size={16} />
                        Export workspace backup
                      </button>
                      <label className="import">
                        Restore JSON backup
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              if (f.size > 350000)
                                throw Error("Backup is too large");
                              const data = workspaceSchema.parse(
                                JSON.parse(await f.text()),
                              );
                              if (
                                confirm(
                                  "Replace your current records with this backup?",
                                )
                              )
                                await persist(data);
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Invalid backup",
                              );
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <h3>Connected foundations</h3>
                      <div className="source-row">
                        <Check size={16} />
                        ORBIT Commerce: catalogs and direct-order exports
                      </div>
                      <div className="source-row">
                        <Check size={16} />
                        Express: service and API foundation
                      </div>
                      <div className="source-row">
                        <Check size={16} />
                        SoundForge: script and recording studio
                      </div>
                      <p className="fineprint">
                        AI generation, automatic publishing and payment
                        processing are not connected. No revenue is generated
                        merely by opening this app.
                      </p>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <footer className="app-footer">
          <span>ORBIT</span>
          <span>
            Built for independent business. Measured in real outcomes.
          </span>
          <ShieldCheck size={14} />
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="section-heading">
              <h2 id="modal-title">
                {modal.item ? "Edit" : "Add"}{" "}
                {modal.kind === "receipt" ? "payment" : modal.kind}
              </h2>
              <button
                className="icon-btn"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="form-grid">
                {modal.kind === "business" && (
                  <>
                    <Field name="name" label="Business name" required />
                    <Field name="category" label="Category" required />
                    <Field
                      name="phone"
                      label="WhatsApp number with country code"
                      required
                    />
                    <Field
                      name="currency"
                      label="Currency"
                      options={["USD", "COP"]}
                    />
                    <Field
                      name="description"
                      label="Description"
                      type="textarea"
                    />
                  </>
                )}
                {modal.kind === "product" && (
                  <>
                    <Field name="name" label="Product name" required />
                    <Field
                      name="stock"
                      label="Available quantity (whole number)"
                      type="number"
                      min={0}
                      required
                    />
                    <Field
                      name="price"
                      label="Selling price"
                      type="number"
                      min={0}
                      required
                    />
                    <Field
                      name="cost"
                      label="Unit cost"
                      type="number"
                      min={0}
                      required
                    />
                    <Field
                      name="image"
                      label="Image URL (HTTPS, optional)"
                      type="url"
                    />
                    <Field
                      name="description"
                      label="Product description"
                      type="textarea"
                    />
                  </>
                )}
                {modal.kind === "deal" && (
                  <>
                    <Field
                      name="name"
                      label="Business / opportunity"
                      required
                    />
                    <Field name="contact" label="Contact (optional)" />
                    <label>
                      Linked business
                      <select
                        name="businessId"
                        defaultValue={String(modalValue("businessId") || "")}
                      >
                        <option value="">Not linked yet</option>
                        {w.businesses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field name="stage" label="Stage" options={[...stages]} />
                    <Field
                      name="source"
                      label="Lead source"
                      options={[
                        "referral",
                        "walk-in",
                        "social",
                        "marketplace",
                        "outbound",
                        "other",
                      ]}
                    />
                    <Field
                      name="priority"
                      label="Priority"
                      options={["medium", "high", "low"]}
                    />
                    <Field
                      name="value"
                      label={`Proposed value (${currency})`}
                      type="number"
                      required
                      min={0}
                    />
                    <Field name="nextAction" label="Next action" />
                    <Field name="due" label="Follow-up date" type="date" />
                    <Field
                      name="lastContact"
                      label="Last contact date"
                      type="date"
                    />
                    <Field
                      name="objection"
                      label="Known objection"
                      type="textarea"
                    />
                    <Field name="notes" label="Notes" type="textarea" />
                  </>
                )}
                {modal.kind === "receipt" && (
                  <>
                    <Field name="label" label="Payment description" required />
                    <label>
                      Linked opportunity
                      <select
                        name="dealId"
                        defaultValue={String(modalValue("dealId") || "")}
                      >
                        <option value="">Not linked</option>
                        {w.deals.map((deal) => (
                          <option key={deal.id} value={deal.id}>
                            {deal.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field
                      name="kind"
                      label="Type"
                      options={["service", "product"]}
                    />
                    <Field
                      name="currency"
                      label="Currency"
                      options={["USD", "COP"]}
                    />
                    <Field
                      name="date"
                      label="Payment / expected date"
                      type="date"
                      required
                    />
                    <Field
                      name="gross"
                      label="Gross amount"
                      type="number"
                      min={0}
                      required
                    />
                    <Field
                      name="cost"
                      label="Delivery + labor cost"
                      type="number"
                      min={0}
                      required
                    />
                    <Field
                      name="fees"
                      label="Processing fees"
                      type="number"
                      min={0}
                    />
                    <Field
                      name="refund"
                      label="Refund amount"
                      type="number"
                      min={0}
                    />
                    <Field
                      name="status"
                      label="Actual payment status"
                      options={["pending", "paid", "refunded"]}
                    />
                    <Field
                      name="reference"
                      label="Receipt / payment reference (required for paid)"
                    />
                  </>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Saving…" : "Save record"}
                <Check size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
