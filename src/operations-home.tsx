import { useEffect, useState } from "react";
import { US_JURISDICTIONS } from "../lib/us-policy.mjs";

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
        if (!response.ok) throw Error("No se pudieron cargar las misiones.");
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
            "Validar un piloto: solicitudes, cotizaciones y seguimiento para " +
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
      if (!response.ok)
        throw Error(data.error || "No se pudo guardar el piloto.");
      setNotice(
        "Piloto guardado. Abre las misiones para trabajar sus tareas; todavía no se ha ejecutado ni enviado nada.",
      );
      const refresh = await fetch("/api/business/missions");
      if (!refresh.ok)
        throw Error(
          "El piloto se guardó, pero no se pudo actualizar la lista. Abre las misiones antes de volver a crearlo.",
        );
      setMissions((await refresh.json()).missions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ padding: 28 }}>
      <p className="eyebrow">ORBIT / OPERACIONES</p>
      <h1>Un objetivo. Trabajo visible. Resultados comprobables.</h1>
      <p>
        Organiza la investigación, la oferta y la entrega de un servicio desde
        un espacio privado.
      </p>
      <p>
        <strong>Estado actual:</strong> planificación y registro de evidencias.
        No hay un ejecutor autónomo conectado.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <h2>Tu trabajo en curso</h2>
      {!loaded && !error && <p role="status">Cargando misiones…</p>}
      {loaded && missions.length === 0 && (
        <p>No hay misiones guardadas. Prepara un piloto para empezar.</p>
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
            /{mission.tasks.length} tareas completadas
          </p>
          <p>
            {mission.summary.launchBlocked
              ? "Preparación pendiente"
              : "Revisiones completadas; ejecución externa pendiente"}
          </p>
          {mission.summary.launchBlockers.length > 0 && (
            <ul>
              {mission.summary.launchBlockers.map((blocker, index) => (
                <li key={index}>{blocker}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
      <button className="neon-button" onClick={openMissions}>
        Abrir misiones y evidencias
      </button>
      <h2>Preparar el primer piloto</h2>
      <p>
        Hipótesis inicial: ayudar a un negocio de limpieza que ya recibe
        consultas a organizar solicitudes y cotizaciones. Primero comprobaremos
        el problema con un comprador.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void prepare(event.currentTarget);
        }}
        style={{ display: "grid", gap: 12, maxWidth: 560 }}
      >
        <label>
          Negocio o tipo de cliente
          <input
            name="customer"
            required
            maxLength={500}
            defaultValue="Pequeña empresa de limpieza"
          />
        </label>
        <label>
          Estado de EE. UU.
          <select name="state" defaultValue="NY" required>
            {US_JURISDICTIONS.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Crear este plan no autoriza gastos ni envíos. Presupuesto externo: 0
          USD. Tiempo inicial de planificación: 120 minutos.
        </p>
        <button
          className="neon-button"
          disabled={!loaded || busy || Boolean(notice)}
        >
          {busy
            ? "Guardando…"
            : notice
              ? "Piloto guardado"
              : "Guardar plan del piloto"}
        </button>
      </form>
      <h2>Cómo avanzaremos</h2>
      <ol>
        <li>Confirmar un problema y guardar su evidencia.</li>
        <li>Preparar una oferta con alcance y costos.</li>
        <li>Revisar calidad y condiciones antes de una entrega.</li>
        <li>
          Preparar los materiales comerciales y medir pagos reales por separado.
        </li>
      </ol>
      <p>
        Una tarea marcada como completada requiere un resultado registrado. Un
        plan, una aprobación o una estimación no equivalen a una venta.
      </p>
    </section>
  );
}
