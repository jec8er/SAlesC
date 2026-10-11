import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

/** Private local-volume adapter. Use a persistent volume, never a public web root.
 * Exclusive file creation serializes claims across processes. Crash locks intentionally
 * require operator recovery after confirming the old worker has stopped; no unsafe TTL.
 * Task text is hashed, not persisted. Outputs must contain only project-safe material.
 */
export function createFileStore(directory) {
  const root = resolve(directory);
  const held = new Map();
  const key = id => createHash('sha256').update(id).digest('hex');
  const paths = id => ({ state: join(root, key(id)+'.json'), lock: join(root,key(id)+'.lock') });
  const read = async id => {
    try { return JSON.parse(await readFile(paths(id).state,'utf8')); }
    catch (e) { if(e.code === 'ENOENT') return null; throw e; }
  };
  const owned = async id => {
    const token = held.get(id);
    if (!token || await readFile(paths(id).lock,'utf8') !== token) throw Error('Task claim is not owned');
  };
  const save = async (id,state) => {
    await owned(id);
    const temp = paths(id).state+'.'+randomUUID()+'.tmp';
    try {
      await writeFile(temp,JSON.stringify(state),{mode:0o600,flag:'wx'});
      await rename(temp,paths(id).state);
    } finally { await unlink(temp).catch(e=>{if(e.code!=='ENOENT') throw e;}); }
  };
  const release = async id => {
    await owned(id); await unlink(paths(id).lock); held.delete(id);
  };
  return {
    async claim(id,task) {
      await mkdir(root,{recursive:true,mode:0o700});
      const token = randomUUID();
      try { await writeFile(paths(id).lock,token,{flag:'wx',mode:0o600}); }
      catch(e) { if(e.code==='EEXIST') return false; throw e; }
      held.set(id,token);
      try {
        const old = await read(id);
        const taskHash = createHash('sha256').update(task).digest('hex');
        if(old && old.taskHash !== taskHash) throw Error('Task ID reused for different work');
        if(old?.result) { await release(id); return false; }
        await save(id,old ?? {taskHash,events:[]}); return true;
      } catch(e) { await release(id); throw e; }
    },
    async append(id,event) {
      await owned(id); const state=await read(id);
      state.events.push(event); await save(id,state);
    },
    async checkpoints(id) { await owned(id); return (await read(id)).events; },
    async finish(id,result) {
      await owned(id); const state=await read(id);
      state.result=result; await save(id,state); await release(id);
    },
    release
  };
}
