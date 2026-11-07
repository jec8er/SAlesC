import { useRef, useState, type CSSProperties } from "react";
import type { OfficeWorkspace } from "../lib/office";
import "./agent-world.css";

const rooms = ["RESEARCH", "CREATIVE", "PRODUCTION", "DISTRIBUTION", "GROWTH", "AUDIT"];
const colorByState = {
  idle: "#8293ac", working: "#62f3c7", waiting: "#ffcd72", blocked: "#ff7e91",
};
type WorldStyle = CSSProperties & Record<`--${string}`, string | number>;

export default function AgentWorld({ office }: { office: OfficeWorkspace }) {
  const [angle, setAngle] = useState(-35);
  const [tilt, setTilt] = useState(57);
  const [zoom, setZoom] = useState(0.72);
  const [selected, setSelected] = useState(office.agents[0]?.id);
  const drag = useRef<{ x: number; y: number; angle: number; tilt: number } | null>(null);
  const agent = office.agents.find((item) => item.id === selected);
  const history = office.handoffs.filter((item) => item.from === selected || item.to === selected).slice(-3);
  return (
    <section className="world-shell" aria-label="Three dimensional agent office">
      <header className="world-toolbar">
        <div><span className="world-eyebrow">ORBIT / AGENT WORLD</span><h2>A place for every mind.</h2></div>
        <div className="world-controls">
          <button onClick={() => setAngle((value) => value - 20)} aria-label="Rotate left">↶</button>
          <button onClick={() => setAngle((value) => value + 20)} aria-label="Rotate right">↷</button>
          <button onClick={() => setZoom((value) => Math.max(0.35, value - 0.1))} aria-label="Zoom out">−</button>
          <button onClick={() => setZoom((value) => Math.min(1.1, value + 0.1))} aria-label="Zoom in">+</button>
          <button onClick={() => { setAngle(-35); setTilt(57); setZoom(0.72); }}>Reset</button>
        </div>
      </header>
      <div className="world-layout">
        <div className="world-viewport"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            drag.current = { x: event.clientX, y: event.clientY, angle, tilt };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setAngle(drag.current.angle + (event.clientX - drag.current.x) * 0.3);
            setTilt(Math.min(72, Math.max(30, drag.current.tilt - (event.clientY - drag.current.y) * 0.2)));
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <div className="world-grid-glow" />
          <div className="world-plane" style={{ transform: `translate(-50%, -50%) scale(${zoom}) rotateX(${tilt}deg) rotateZ(${angle}deg)` }}>
            <div className="world-floor" />
            <div className="world-wall world-wall-back" />
            <div className="world-wall world-wall-left" />
            <div className="world-core"><span>QWEN</span><small>{office.qwen.status.replaceAll("_", " ")}</small></div>
            {rooms.map((room, index) => (
              <div key={room} className="world-room" style={{ left: 32 + (index % 3) * 225, top: 32 + Math.floor(index / 3) * 300 }}>
                <span className="world-room-label">{room}</span>
              </div>
            ))}
            {office.agents.map((item, index) => {
              const room = Math.floor(index / 3);
              const x = 70 + (room % 3) * 225 + (index % 3) * 58;
              const y = 120 + Math.floor(room / 3) * 300;
              return (
                <div className="world-station" key={item.id}
                  style={{ left: x, top: y, "--agent-color": colorByState[item.state] } as WorldStyle}>
                  <div className="world-desk"><div className="world-screen" /></div>
                  <button className={`world-agent ${selected === item.id ? "is-selected" : ""} state-${item.state}`}
                    onClick={() => setSelected(item.id)}
                    aria-label={`${item.name}: ${item.state}. Inspect agent.`}
                    aria-pressed={selected === item.id}>
                    <span className="world-agent-head"><i /></span>
                    <span className="world-agent-body" />
                    <span className="world-agent-foot left" /><span className="world-agent-foot right" />
                    <span className="world-agent-ring" />
                  </button>
                  <span className="world-agent-name">{item.name}</span>
                </div>
              );
            })}
          </div>
          <div className="world-caption">Drag to orbit · Select an agent to inspect</div>
          <div className="world-legend">{Object.entries(colorByState).map(([state, color]) => (
            <span key={state}><i style={{ background: color }} />{state}</span>
          ))}</div>
        </div>
        <aside className="world-inspector" aria-live="polite">
          <span className="world-eyebrow">AGENT INSPECTOR</span>
          <h3>{agent?.name || "Select an agent"}</h3>
          <p>{agent?.specialty}</p>
          {agent && <span className="world-state" style={{ color: colorByState[agent.state] }}>{agent.state.toUpperCase()}</span>}
          <dl><dt>Engine</dt><dd>Qwen · {office.qwen.status.replaceAll("_", " ")}</dd>
            <dt>Workflow stage</dt><dd>{office.currentStage.replaceAll("_", " ")}</dd>
            <dt>Recorded handoffs</dt><dd>{history.length ? "Latest activity below" : "No recorded work for this agent"}</dd></dl>
          {history.map((item) => <div className="world-event" key={item.id}><strong>{item.status}</strong><p>{item.note}</p><small>{item.createdAt}</small></div>)}
          <p className="world-truth">Agent activity reflects the saved office state. Movement and lighting do not indicate completed work or revenue.</p>
        </aside>
      </div>
      <div className="world-agent-picker" aria-label="Choose an agent">
        {office.agents.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}>{item.name}</button>)}
      </div>
    </section>
  );
}
