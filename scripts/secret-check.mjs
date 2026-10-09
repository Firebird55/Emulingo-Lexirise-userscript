
import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
const patterns=[/lx_[A-Za-z0-9]{40,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AKIA[0-9A-Z]{16}/];
// Google Drive can add desktop.ini beneath .git/refs. Enumerate valid refs:
// never delete metadata or accidentally publish Codex checkpoint refs.
const refResult=execFileSync('git',['for-each-ref','--format=%(refname)'],{encoding:'utf8',stdio:['pipe','pipe','pipe']});
const refs=refResult.trim().split('\n').filter(Boolean);
const objects=[...new Set(git('rev-list','--objects','HEAD',...refs).trim().split('\n').map(l=>l.split(' ')[0]))];
const batch=execFileSync('git',['cat-file','--batch'],{input:objects.join('\n')+'\n',maxBuffer:512*1024*1024});
let offset=0,blobs=0;
while(offset<batch.length){
 const end=batch.indexOf(10,offset);if(end<0)break;const [oid,type,length]=batch.subarray(offset,end).toString().split(' ');offset=end+1;
 const size=Number(length);if(!Number.isFinite(size))throw new Error('Unscannable Git object.');
 if(type==='blob'){blobs++;if(patterns.some(p=>p.test(batch.subarray(offset,offset+size).toString())))throw new Error('Potential credential in reachable history. Do not upload; prepare a sanitized publishing copy.');}
 offset+=size+1;
}
for(const file of git('ls-files').trim().split('\n')){
 if(/(?:^|\/)(?:node_modules|data|\.venv|output|diagnostics)\//.test(file)||/\.(?:dpapi|db|sqlite|zip|mp3|wav|mp4|onemodel)$/i.test(file))throw new Error('Private/generated asset tracked: '+file);
 const content=git('show',':'+file);if(patterns.some(p=>p.test(content)))throw new Error('Potential credential in tracked file. Do not upload.');
}
console.log('Secret and private-asset scan passed: '+blobs+' reachable blobs and tracked files.');
