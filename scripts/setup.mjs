import {existsSync,writeFileSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {passwordHash} from '../server/auth.ts';
if(existsSync('.env')){console.error('.env already exists. Edit it directly to change configuration.');process.exit(1);}
if(!process.stdin.isTTY){console.error('Run npm run setup in an interactive terminal.');process.exit(1);}
const sink=new Writable({write(_chunk,_encoding,callback){callback();}});
const rl=createInterface({input:process.stdin,output:sink,terminal:true});
process.stdout.write('Choose an owner password (12+ characters; input hidden): ');
const first=await rl.question('');process.stdout.write('\nConfirm password: ');const second=await rl.question('');rl.close();process.stdout.write('\n');
if(first!==second){console.error('Passwords do not match. Nothing was saved.');process.exit(1);}
const hash=passwordHash(first);
writeFileSync('.env',`OWNER_PASSWORD_HASH=${hash}\nOWNER_NAME=Juan\nDATABASE_PATH=data/studio.sqlite\nHOST=127.0.0.1\nPORT=3001\n`,{mode:0o600,flag:'wx'});
console.log('Owner access configured. Run npm run build, then npm start.');
