import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplication } from "../server/app.ts";
import { passwordHash } from "../server/auth.ts";

test("business missions enforce authentication, CSRF, revision, and restart persistence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "orbit-business-"));
  const path = join(dir, "app.sqlite");
  const pass = "fixture-business-secret";
  const hash = passwordHash(pass);
  async function launch() {
    const runtime = createApplication({ databasePath: path, passwordHash: hash });
    const server = runtime.app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw Error("Missing listener");
    return { origin: "http://127.0.0.1:" + address.port, close: async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
      runtime.close();
    }};
  }
  let s = await launch();
  try {
    assert.equal((await fetch(s.origin + "/api/business/missions")).status, 401);
    const logged = await fetch(s.origin + "/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    assert.equal(logged.status, 200);
    const csrf = (await logged.json() as { csrf: string }).csrf;
    const cookie = (logged.headers.get("set-cookie") || "").split(";")[0];
    const url = s.origin + "/api/business/missions";
    const input = { id: "example", goal: "Validate a merchant offer", customer: "Small shop", maxCostCents: 600, maxMinutes: 120 };
    assert.equal((await fetch(url, {method:"POST",headers:{"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify(input)})).status,403);
    const headers = {"Content-Type":"application/json",Cookie:cookie,"X-CSRF-Token":csrf};
    let r = await fetch(url,{method:"POST",headers,body:JSON.stringify(input)});
    assert.equal(r.status,201);
    assert.equal((await fetch(url,{headers:{Cookie:cookie}})).status,200);
    r = await fetch(url,{method:"POST",headers,body:JSON.stringify(input)});
    assert.equal(r.status,409);
    r = await fetch(url+"/example/actions",{method:"POST",headers,body:JSON.stringify({revision:0,action:"start",taskId:"research"})});
    assert.equal(r.status,200);
    r = await fetch(url+"/example/actions",{method:"POST",headers,body:JSON.stringify({revision:0,action:"start",taskId:"research"})});
    assert.equal(r.status,409);
    await s.close();
    s = await launch();
    assert.equal((await fetch(s.origin + "/api/business/missions")).status,401);
    const secondLogin = await fetch(s.origin + "/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pass})});
    const secondCookie=(secondLogin.headers.get("set-cookie")||"").split(";")[0];
    const stored=await fetch(s.origin+"/api/business/missions",{headers:{Cookie:secondCookie}});
    assert.equal(stored.status,200);
    const result=await stored.json() as {missions:{id:string;revision:number;tasks:{id:string;status:string}[]}[]};
    assert.equal(result.missions[0].id,"example");
    assert.equal(result.missions[0].revision,1);
    assert.equal(result.missions[0].tasks[0].status,"running");
  } finally { await s.close(); rmSync(dir,{recursive:true,force:true}); }
});
