
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'&&cmd==='npm'});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const version=process.argv[process.argv.indexOf('--version')+1];
if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version??''))throw new Error('Use npm run release -- --version <semver>.');
if(git('status','--porcelain'))throw new Error('Release requires a clean checkout. Commit completed work first.');
if(git('branch','--show-current')!=='main')throw new Error('Release from main.');
const current=JSON.parse(readFileSync('package.json','utf8')).version;
const nextParts=version.split('-')[0].split('.').map(Number),oldParts=current.split('-')[0].split('.').map(Number);
const first=nextParts.findIndex((part,i)=>part!==oldParts[i]);
if(first<0&&!(current.includes('-')&&!version.includes('-'))||first>=0&&nextParts[first]<oldParts[first])throw new Error('Use a higher semantic version than '+current+' (or finalize its prerelease).');
try{git('rev-parse','--verify','refs/tags/v'+version);throw new Error('Version already tagged.');}catch(e){if(e.message==='Version already tagged.')throw e;}
run(process.execPath,['scripts/verify-vendor.mjs']);run('npm',['run','check']);run('npm',['run','audit:public']);run('npm',['run','test:browser']);run('npm',['run','test:firefox']);
const pkg=JSON.parse(readFileSync('package.json','utf8'));pkg.version=version;writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
run('npm',['install','--package-lock-only','--ignore-scripts']);
writeFileSync('VERSION',version+'\n');writeFileSync('release-version.json',JSON.stringify({version,releaseCommand:'npm run release -- --version '+version},null,2)+'\n');
if(existsSync('src/userscript-header.txt')){const path='src/userscript-header.txt';writeFileSync(path,readFileSync(path,'utf8').replace(/(@version\s+)\S+/,(_,prefix)=>prefix+version));}
run('git',['add','package.json','package-lock.json','VERSION','release-version.json',...(existsSync('src/userscript-header.txt')?['src/userscript-header.txt']:[])]);
run('git',['commit','-m','Release '+version]);run('git',['tag','-a','v'+version,'-m','Release '+version]);
run('git',['push','origin','main']);run('git',['push','origin','refs/tags/v'+version]);
console.log('Tagged '+version+'. Monitor gh run list and gh run watch; do not declare success until the hosted release and downloads pass.');
