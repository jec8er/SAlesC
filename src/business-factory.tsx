import { useEffect, useState } from "react";
type Task = {id:string;department:string;status:string;expectedArtifact:string;artifact:null|{summary:string};maxCostCents:number;maxMinutes:number};
type Mission = {id:string;goal:string;customer:string;revision:number;tasks:Task[]};
export default function BusinessFactory({csrf}:{csrf:string}) {
 const [missions,setMissions]=useState<Mission[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function reload(){
   const response=await fetch("/api/business/missions");
   if(!response.ok) throw Error("Cannot load missions");
   setMissions((await response.json()).missions);
 }
 useEffect(()=>{void reload().catch(e=>setError(String(e)))},[]);
 async function write(url:string,body:unknown){
   setBusy(true);setError("");
   try{
     const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(body)});
     const data=await r.json();
     if(!r.ok) throw Error(data.error||"Request failed");
     await reload();
   }catch(e){setError(e instanceof Error?e.message:"Request failed")}
   finally{setBusy(false)}
 }
 function create(form:HTMLFormElement){
   const fields=new FormData(form);
   void write("/api/business/missions",{id:crypto.randomUUID(),goal:String(fields.get("goal")||""),customer:String(fields.get("customer")||""),maxCostCents:Math.round(Number(fields.get("budget")||0)*100),maxMinutes:Number(fields.get("minutes")||120)});
 }
 function action(m:Mission,t:Task,kind:"start"|"submit"|"review",approved?:boolean){
   const payload:Record<string,unknown>={revision:m.revision,action:kind,taskId:t.id};
   if(kind==="submit"){
     const summary=window.prompt("Describe the completed artifact:");
     if(!summary)return;
     const source=window.prompt("Evidence URL or reference (required for research):")||"";
     payload.artifact={kind:t.expectedArtifact,summary,evidence:source.trim()?[source.trim()]:[],costCents:0,minutes:0};
   }
   if(kind==="review"){
     const note=window.prompt("Review note:");
     if(!note)return;
     payload.decision={approved,note};
   }
   void write("/api/business/missions/"+encodeURIComponent(m.id)+"/actions",payload);
 }
 return <section className="panel" style={{padding:24}}>
   <h2>Business Factory</h2>
   <p>Commercial planning, not autonomous execution. No messages, listings or payments are sent.</p>
   {error&&<p role="alert">{error}</p>}
   <form onSubmit={e=>{e.preventDefault();create(e.currentTarget)}} style={{display:"grid",gap:12,maxWidth:540}}>
     <label>Goal <input name="goal" required maxLength={2000} placeholder="Validate Direct Commerce Launch"/></label>
     <label>Customer <input name="customer" required maxLength={2000} placeholder="Local merchants"/></label>
     <label>Budget ($) <input name="budget" type="number" min="0" max="10000" step=".01" defaultValue="0" required/></label>
     <label>Minutes <input name="minutes" type="number" min="0" max="1000000" defaultValue="120" required/></label>
     <button disabled={busy} type="submit">Create mission</button>
   </form>
   <div style={{display:"grid",gap:16,marginTop:24}}>
     {missions.map(m=><article key={m.id} style={{border:"1px solid #777",borderRadius:12,padding:16}}>
       <h3>{m.goal}</h3><p>Customer: {m.customer} · Revision {m.revision}</p>
       {m.tasks.map(t=><div key={t.id} style={{borderTop:"1px solid #777",padding:10}}>
         <strong>{t.department} / {t.id}</strong> — {t.status}
         <p>Output: {t.expectedArtifact} · Cap {(t.maxCostCents/100).toFixed(2)} USD / {t.maxMinutes} min</p>
         {t.artifact&&<p>Artifact: {t.artifact.summary}</p>}
         {t.status==="ready"&&<button disabled={busy} onClick={()=>action(m,t,"start")}>Start</button>}
         {t.status==="running"&&<button disabled={busy} onClick={()=>action(m,t,"submit")}>Submit artifact</button>}
         {t.status==="review"&&<><button disabled={busy} onClick={()=>action(m,t,"review",true)}>Approve</button>{" "}<button disabled={busy} onClick={()=>action(m,t,"review",false)}>Reject</button></>}
       </div>)}
     </article>)}
   </div>
 </section>;
}
