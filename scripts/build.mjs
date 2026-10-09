import {build} from 'esbuild';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {metadata} from './userscript-metadata.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8'));
const header=metadata(await readFile('src/userscript-header.txt','utf8'),pkg.version);
await mkdir('dist',{recursive:true});
const result=await build({entryPoints:['src/main.tsx'],bundle:true,outfile:'dist/emulingo-lexirise.user.js',format:'iife',target:['safari15','chrome100'],minify:true,metafile:true,legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'},loader:{'.css':'text'},banner:{js:header}});
const packages=new Map();
for(const input of Object.keys(result.metafile.inputs)){
 if(!input.replaceAll('\\','/').includes('node_modules/'))continue;
 let dir=dirname(resolve(input));
 while(dir!==dirname(dir)){
  if(existsSync(join(dir,'package.json'))){
   const dependency=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));
   if(!dependency.name?.startsWith('@firebird55/')){
    const licenses=readdirSync(dir).filter(name=>/^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(name));
    if(!licenses.length)throw new Error('Missing license text for '+dependency.name);
    packages.set(dependency.name+'@'+dependency.version,{dependency,dir,licenses});
   }
   break;
  }
  dir=dirname(dir);
 }
}
const notices=[...packages.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name,{dependency,dir,licenses}])=>
 '=== '+name+' ('+dependency.license+') ===\n'+licenses.map(file=>file+'\n'+readFileSync(join(dir,file),'utf8')).join('\n')).join('\n\n');
await writeFile('dist/THIRD_PARTY_NOTICES.txt',notices+'\n');
const license=await readFile('LICENSE','utf8'),notice=await readFile('NOTICE.md','utf8');
await appendFile('dist/emulingo-lexirise.user.js','\n/*\n'+(license+'\n'+notice+'\n'+notices).replaceAll('*/','* /')+'\n*/\n');
await writeFile('dist/emulingo-lexirise.meta.js',header);
console.log('Built standalone userscript, metadata-only update check and dependency license notices.');

