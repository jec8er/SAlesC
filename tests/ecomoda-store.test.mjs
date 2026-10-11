import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createCycleStore} from "../server/ecomoda-store.mjs";
import {runCycle} from "../lib/ecomoda-core.mjs";
test("durable result survives restart and task IDs cannot be reused",()=>{
 const dir=mkdtempSync(join(tmpdir(),"ai-store-")); const path=join(dir,"state.sqlite");
 let s=createCycleStore(path); assert.equal(s.claim("a","task"),true);
 s.append("a",{output:"plan"});s.finish("a",{status:"done"});s.close();
 s=createCycleStore(path);assert.equal(s.read("a").result.status,"done");
 assert.equal(s.claim("a","task"),false);assert.throws(()=>s.claim("a","other"),/different task/);
 s.close();rmSync(dir,{recursive:true});
});
test("concurrent claims and expired-owner fencing",()=>{
 const dir=mkdtempSync(join(tmpdir(),"ai-lease-"));let clock=0;
 const opts={now:()=>clock,leaseMs:1000};
 const a=createCycleStore(join(dir,"db"),opts),b=createCycleStore(join(dir,"db"),opts);
 assert.equal(a.claim("a","task"),true);assert.equal(b.claim("a","task"),false);
 clock=1001;assert.equal(b.claim("a","task"),true);
 assert.throws(()=>a.append("a",{}),/lease lost/);
 assert.throws(()=>a.release("a"),/lease lost/);
 b.finish("a",{});a.close();b.close();rmSync(dir,{recursive:true});
});
test("retry resumes persisted steps without repeating successful inference",async()=>{
 const s=createCycleStore(":memory:");let calls=[];
 const infer=async({role})=>{calls.push(role);if(role==="Marcela")throw Error("offline");return role;};
 await assert.rejects(runCycle({id:"c",task:"task",store:s,infer}),/offline/);
 assert.deepEqual(calls,["Betty","Hugo","Marcela"]);calls=[];
 const r=await runCycle({id:"c",task:"task",store:s,infer:async({role})=>{
 calls.push(role);return '{"accepted":true,"defects":[]}';}});
 assert.deepEqual(calls,["Marcela"]);assert.equal(r.publishAllowed,false);
 assert.equal(r.status,"awaiting_artifact_validation");s.close();
});
test("invalid review is not checkpointed and can recover",async()=>{
 const s=createCycleStore(":memory:");
 await assert.rejects(runCycle({id:"d",task:"task",store:s,infer:async({role})=>role}),/invalid JSON/);
 const r=await runCycle({id:"d",task:"task",store:s,infer:async()=> '{"accepted":false,"defects":["missing evidence"]}'});
 assert.equal(r.status,"revision_required");s.close();
});
