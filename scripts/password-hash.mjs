import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {passwordHash} from '../server/auth.ts';
let password;
if(process.stdin.isTTY){const sink=new Writable({write(_chunk,_encoding,callback){callback();}});const r=createInterface({input:process.stdin,output:sink,terminal:true});process.stdout.write('Owner password (12+ characters; input hidden): ');password=await r.question('');r.close();process.stdout.write('\n');}else{const chunks=[];for await(const c of process.stdin)chunks.push(c);password=Buffer.concat(chunks).toString().replace(/\r?\n$/,'');}
console.log(passwordHash(password));
