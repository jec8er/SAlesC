import {spawn} from 'node:child_process';
if(!process.env.OWNER_PASSWORD_HASH){console.error('Configure OWNER_PASSWORD_HASH first. See README.md.');process.exit(1);}
const children=[spawn(process.execPath,['server/start.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'})];
let stopped=false;function stop(code=0){if(stopped)return;stopped=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const child of children){child.on('error',()=>stop(1));child.on('exit',code=>stop(code||0));}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
