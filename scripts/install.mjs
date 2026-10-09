import {createServer} from 'node:http';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
console.log('Emulingo Lexirise userscript: browser installation on mobile or desktop; no local game files required.');
console.log('AI contributors: read AGENTS.md, CONTRIBUTING.md and RELEASE.md. Preserve storage/keys; commit logical changes and run checks before pushing.');
console.log('Edit shared UI in Lexirise-shared-components, never vendor copies. Use the documented release command and verify hosted assets.');
if(process.argv.includes('--instructions-only'))process.exit(0);
let script=join(root,'emulingo-lexirise.user.js');
if(process.argv.includes('--contribute')||!existsSync(script)&&!existsSync(join(root,'dist/emulingo-lexirise.user.js'))){
 if(!existsSync(join(root,'package-lock.json')))throw new Error('For development, clone the source repository; this installer bundle contains the tested userscript, not dependencies.');
 for(const args of [['ci'],['run',process.argv.includes('--contribute')?'check':'build']])execFileSync('npm',args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
}
if(!existsSync(script))script=join(root,'dist/emulingo-lexirise.user.js');
if(!existsSync(script))throw new Error('Installable userscript missing. Download the installer ZIP or build the source checkout.');
const files={'/':'INSTALL.html','/INSTALL.md':'INSTALL.md','/AGENTS.md':'AGENTS.md','/CONTRIBUTING.md':'CONTRIBUTING.md','/RELEASE.md':'RELEASE.md','/LICENSE':'LICENSE','/NOTICE.md':'NOTICE.md','/THIRD_PARTY_NOTICES.txt':existsSync(join(root,'THIRD_PARTY_NOTICES.txt'))?'THIRD_PARTY_NOTICES.txt':'dist/THIRD_PARTY_NOTICES.txt'};
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=path==='/emulingo-lexirise.user.js'?script:files[path]?join(root,files[path]):null;
 if(!file||!existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':path.endsWith('.user.js')?'text/javascript; charset=utf-8':path==='/'?'text/html; charset=utf-8':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(readFileSync(file));
});
server.listen(0,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+server.address().port+'/';
 console.log('Installer: '+url+' — review and approve installation in your userscript manager. Ctrl+C stops the local installer.');
 if(!process.argv.includes('--no-browser')){
  if(process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('Open '+url+' manually.'));
  else if(process.platform==='darwin')spawn('open',[url],{stdio:'ignore'}).on('error',()=>console.log('Open '+url+' manually.'));
  else spawn('xdg-open',[url],{stdio:'ignore'}).on('error',()=>console.log('Open '+url+' manually.'));
 }
});
