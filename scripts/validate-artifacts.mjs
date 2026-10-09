
import {readFileSync,statSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {metadata} from './userscript-metadata.mjs';
import {privateContent} from './public-audit.mjs';

function zipNames(data){
 let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(data.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('Invalid ZIP end record');
 const count=data.readUInt16LE(end+10);let cursor=data.readUInt32LE(end+16);const names=[];
 for(let i=0;i<count;i++){if(data.readUInt32LE(cursor)!==0x02014b50)throw new Error('Invalid ZIP directory');
 const n=data.readUInt16LE(cursor+28),extra=data.readUInt16LE(cursor+30),comment=data.readUInt16LE(cursor+32);
 names.push(data.subarray(cursor+46,cursor+46+n).toString('utf8'));cursor+=46+n+extra+comment;}
 return names;
}

const sums=readFileSync('release/SHA256SUMS','utf8').trim().split('\n'),pkg=JSON.parse(readFileSync('package.json','utf8'));
for(const line of sums){const [hash,file]=line.split('  ');if(!file||file.includes('/')||file.includes('..'))throw new Error('Unsafe checksum name');const data=readFileSync('release/'+file);if(createHash('sha256').update(data).digest('hex')!==hash)throw new Error('Checksum mismatch');
 if(/\.(?:js|json|md|txt|html)$/.test(file)&&privateContent(data.toString()))throw new Error('Private data in artifact');
 if(file.endsWith('.user.js')){
  const header=metadata(readFileSync('src/userscript-header.txt','utf8'),pkg.version);
  if(!data.toString().startsWith(header))throw new Error('Userscript metadata mismatch');
  if(!data.toString().includes('Firebird55 Attribution License')||!data.toString().includes('THIRD')&&!data.toString().includes('=== react@'))throw new Error('Missing embedded license notices');
 }
 if(file.endsWith('.zip')){const entries=zipNames(data);if(entries.some(p=>/node_modules\/|\/data\/|\.dpapi$|\.db$|\.mp3$|\.wav$|^\.git\//.test(p)))throw new Error('Private/generated asset in ZIP');if(pkg.name==='game-immersion-toolkit'&&!entries.some(p=>p.includes('/dist/client/')))throw new Error('Built frontend missing');}
}
const provenance=JSON.parse(readFileSync('release/PROVENANCE.json','utf8'));
const expected=metadata(readFileSync('src/userscript-header.txt','utf8'),pkg.version);
if(readFileSync('release/emulingo-lexirise.meta.js','utf8')!==expected)throw new Error('Update metadata must contain only the exact metadata block');
if(!readFileSync('release/emulingo-lexirise.user.js').equals(readFileSync('release/emulingo-lexirise-'+pkg.version+'.user.js')))throw new Error('Stable and versioned downloads differ');
for(const file of ['LICENSE.txt','NOTICE.md','THIRD_PARTY_NOTICES.txt'])if(!readFileSync('release/'+file,'utf8').trim())throw new Error('Empty license notice');
const installer=zipNames(readFileSync('release/Emulingo-Lexirise-installer-'+pkg.version+'.zip'));
for(const file of ['LICENSE','NOTICE.md','THIRD_PARTY_NOTICES.txt','AGENTS.md','emulingo-lexirise.meta.js'])if(!installer.some(name=>name.endsWith('/'+file)))throw new Error('Missing installer notice/guide '+file);
if(provenance.version!==pkg.version||provenance.sourceCommit!==execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim())throw new Error('Artifact provenance mismatch');
console.log('Checksums, stable update metadata, license notices and provenance verified.');
