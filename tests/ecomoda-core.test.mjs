import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runCycle} from '../lib/ecomoda-core.mjs';
function fixture(outputs) {
 let claimed=false; const events=[]; let finished=null;
 return {events, get finished(){return finished},
 infer: async()=>outputs.shift(),
 store:{claim:async()=>{if(claimed)return false;claimed=true;return true},
 append:async(_,e)=>events.push(e),finish:async(_,r)=>{finished=r},
 release:async()=>{claimed=false}}};
}
test('rejection produces revision, never publication or revenue',async()=>{
 const f=fixture(['plan','draft','{"accepted":false,"defects":["no render evidence"]}','revision']);
 const r=await runCycle({id:'a',task:'improve',...f});
 assert.equal(r.status,'revision_required');assert.equal(r.publishAllowed,false);
 assert.equal(r.verifiedRevenue,null);assert.equal(f.events.length,4);
 assert.equal((await runCycle({id:'a',task:'improve',...f})).status,'skipped');
});
test('accepted model review still requires artifact validation',async()=>{
 const f=fixture(['plan','draft','{"accepted":true,"defects":[]}']);
 assert.equal((await runCycle({id:'b',task:'improve',...f})).status,'awaiting_artifact_validation');
});
test('invalid review fails visibly and releases work',async()=>{
 const f=fixture(['plan','draft','bad']);
 await assert.rejects(runCycle({id:'c',task:'improve',...f}),/invalid JSON/);
 assert.equal(f.finished,null);assert.equal(f.events.at(-1).type,'failure');
 f.infer=async()=>{throw new Error('provider unavailable')};
 await assert.rejects(runCycle({id:'c',task:'improve',...f}),/provider unavailable/);
});
test('no inference adapter is reported, not simulated',async()=>{
 await assert.rejects(runCycle({id:'d',task:'improve'}),/not connected/);
});
