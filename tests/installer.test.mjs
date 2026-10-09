import {test} from 'node:test';import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
test('installer serves only the approved userscript and contributor guides on loopback',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'emulingo-installer-test-'));mkdirSync(join(dir,'scripts'));
 copyFileSync('scripts/install.mjs',join(dir,'scripts/install.mjs'));
 for(const file of ['INSTALL.html','INSTALL.md','AGENTS.md','CONTRIBUTING.md','RELEASE.md'])copyFileSync(file,join(dir,file));
 writeFileSync(join(dir,'emulingo-lexirise.user.js'),'// ==UserScript==\n// mock install test\n');
 const proc=spawn(process.execPath,['scripts/install.mjs','--no-browser'],{cwd:dir,stdio:['ignore','pipe','pipe']});
 try{
  const url=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(new Error('Installer timeout')),10000);proc.stdout.on('data',b=>{text+=b;const match=text.match(/Installer: (http:\/\/127\.0\.0\.1:\d+\/)/);if(match){clearTimeout(timeout);resolve(match[1]);}});proc.once('error',reject);});
  assert((await (await fetch(url)).text()).includes('Contributing with an AI agent'));
  assert((await (await fetch(url+'AGENTS.md')).text()).includes('Agent workflow'));
  const script=await fetch(url+'emulingo-lexirise.user.js');assert.equal(script.status,200);assert(script.headers.get('content-type').includes('javascript'));
  assert.equal((await fetch(url+'package.json')).status,404);
  assert.equal((await fetch(url+'LexiriseAPIKey.txt')).status,404);
 }finally{proc.kill();await new Promise(r=>proc.once('exit',r));rmSync(dir,{recursive:true,force:true});}
 const text=execFileSync(process.execPath,['scripts/install.mjs','--instructions-only'],{encoding:'utf8'});assert(text.includes('AGENTS.md'));
});
