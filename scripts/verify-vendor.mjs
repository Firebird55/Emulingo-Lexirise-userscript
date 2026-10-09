
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
if(!existsSync('vendor/lexirise-components/package.json')){if(read('package.json').name==='@firebird55/lexirise-components')process.exit(0);throw new Error('Shared vendor package missing.');}
const pin=read('vendor/lexirise-components/PROVENANCE.json'),pkg=read('vendor/lexirise-components/package.json');
if(!/^[0-9a-f]{40}$/.test(pin.sourceCommit)||pin.version!==pkg.version||pin.repository!=='Firebird55/Lexirise-shared-components')throw new Error('Invalid shared-package provenance.');
if(read('package.json').dependencies?.['@firebird55/lexirise-components']!=='file:vendor/lexirise-components')throw new Error('Consumer must use pinned local shared package.');
console.log('Shared package pin: '+pin.version+' @ '+pin.sourceCommit);
