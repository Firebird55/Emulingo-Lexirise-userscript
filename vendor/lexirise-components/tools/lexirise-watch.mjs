
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const hash=s=>createHash('sha256').update(s).digest('hex');
const baselinePath=fileURLToPath(new URL('../lexirise-baseline.json',import.meta.url));
const docsUrl='https://lexirise.app/api-reference',siteUrl='https://lexirise.app';
async function get(url){const response=await fetch(url,{headers:{'User-Agent':'Lexirise-compatibility-review/1.0'},signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Public reference unavailable: HTTP '+response.status);return response.text();}
const [docs,site]=await Promise.all([get(docsUrl),get(siteUrl)]);
const normalize=html=>html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const text=normalize(docs),endpoints=[...new Set((text.match(/\/v1\/[a-zA-Z0-9_\/{}-]+/g)||[]).map(p=>p.replace(/\/$/,'')))].sort();
const scripts=[...new Set([...site.matchAll(/src=["']([^"']+\/chunks\/[^"']+\.js)["']/g)].map(m=>new URL(m[1],siteUrl).href))].sort();
const websiteHashes=Object.fromEntries(await Promise.all(scripts.map(async url=>[new URL(url).pathname,hash(await get(url))])));
const snapshot={schemaVersion:1,sources:[docsUrl,siteUrl],docsHash:hash(text),endpoints,websiteHashes};
if(process.argv.includes('--record')){writeFileSync(baselinePath,JSON.stringify(snapshot,null,2)+'\n');console.log('Public reference baseline recorded. Review and commit it after compatibility tests.');}
else{
 const baseline=JSON.parse(readFileSync(baselinePath,'utf8'));
 const docsChanged=baseline.docsHash!==snapshot.docsHash,uiChanged=JSON.stringify(baseline.websiteHashes)!==JSON.stringify(snapshot.websiteHashes);
 const added=endpoints.filter(p=>!baseline.endpoints.includes(p)),removed=baseline.endpoints.filter(p=>!endpoints.includes(p));
 const report={checkedAt:new Date().toISOString(),docsChanged,uiChanged,addedEndpoints:added,removedEndpoints:removed,reviewRequired:docsChanged||uiChanged,
 reviewAreas:['account settings schema and accepted values','lookup window tabs, actions and portal behavior','AI/API reference endpoints and transports','study versus translation/interface languages and capability manifest'],
 instructions:'Read AGENTS.md and RELEASE.md. Inspect official changes; update shared source only. Mock account writes; use read-only live checks. Publish shared release, synchronize both consumers, run resolution/zoom checks and release each app. Never change account settings or dependencies automatically.'};
 mkdirSync('.watch',{recursive:true});writeFileSync('.watch/report.json',JSON.stringify(report,null,2)+'\n');
 writeFileSync('.watch/report.md','# Lexirise compatibility review\n\n'+(report.reviewRequired?'Changes detected — agent review required.':'No public-reference change detected.')+'\n\n'+report.reviewAreas.map(s=>'- '+s).join('\n')+'\n\n'+report.instructions+'\n');
 console.log(JSON.stringify(report,null,2));if(report.reviewRequired)process.exitCode=2;
}
