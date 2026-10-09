
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,cpSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {installerBundle} from './installer-bundle.mjs';
const pkg=JSON.parse(readFileSync('package.json','utf8')),version=pkg.version;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const repository=process.env.GITHUB_REPOSITORY||({ '@firebird55/lexirise-components':'Firebird55/Lexirise-shared-components','emulingo-lexirise':'Firebird55/Emulingo-Lexirise-userscript','game-immersion-toolkit':'Firebird55/Game-immersion-toolkit'}[pkg.name]);
const provenance={version,sourceCommit:sha,repository,shared:pkg.name==='@firebird55/lexirise-components'?null:JSON.parse(readFileSync('vendor/lexirise-components/PROVENANCE.json','utf8'))};
mkdirSync('release',{recursive:true});writeFileSync('release/PROVENANCE.json',JSON.stringify(provenance,null,2)+'\n');
if(pkg.name==='@firebird55/lexirise-components'){
 writeFileSync('PROVENANCE.json',JSON.stringify(provenance,null,2)+'\n');
 execFileSync('npm',['pack','--ignore-scripts','--pack-destination','release'],{stdio:'inherit',shell:process.platform==='win32'});
 execFileSync('git',['archive','--format=zip','-o','release/lexirise-components-source-'+version+'.zip','HEAD']);
}else if(pkg.name==='emulingo-lexirise'){
 copyFileSync('dist/emulingo-lexirise.user.js','release/emulingo-lexirise-'+version+'.user.js');
 copyFileSync('dist/emulingo-lexirise.user.js','release/emulingo-lexirise.user.js');
 copyFileSync('dist/emulingo-lexirise.meta.js','release/emulingo-lexirise.meta.js');
 copyFileSync('dist/emulingo-lexirise.meta.js','release/userscript-metadata.txt');
 copyFileSync('LICENSE','release/LICENSE.txt');copyFileSync('NOTICE.md','release/NOTICE.md');
 copyFileSync('dist/THIRD_PARTY_NOTICES.txt','release/THIRD_PARTY_NOTICES.txt');installerBundle(version);
}else{
 if(process.platform!=='win32')throw new Error('Toolkit distribution is packaged on Windows.');
 const folder='release/Game-immersion-toolkit-'+version;mkdirSync(folder,{recursive:true});
 execFileSync('git',['archive','--format=tar','-o','release/source.tar','HEAD']);
 execFileSync('tar',['-xf','release/source.tar','-C',folder]);
 cpSync('dist',folder+'/dist',{recursive:true});copyFileSync('release/PROVENANCE.json',folder+'/PROVENANCE.json');
 execFileSync('powershell',['-NoProfile','-Command',"$ErrorActionPreference='Stop'; Compress-Archive -LiteralPath '"+folder+"' -DestinationPath 'release/Game-immersion-toolkit-"+version+".zip'"],{stdio:'inherit'});
 execFileSync(process.execPath,['-e',"require('fs').unlinkSync('release/source.tar')"]);
}
for(const file of ['INSTALL.md','INSTALL.html','AGENTS.md','CONTRIBUTING.md'])copyFileSync(file,'release/'+file);
const assets=readdirSync('release').filter(f=>statSync('release/'+f).isFile()&&f!=='SHA256SUMS');
writeFileSync('release/SHA256SUMS',assets.map(f=>createHash('sha256').update(readFileSync('release/'+f)).digest('hex')+'  '+f).join('\n')+'\n');
console.log('Release assets and SHA-256 checksums prepared for '+version+' @ '+sha);
