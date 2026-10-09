import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {metadata,downloadURL,updateURL} from '../scripts/userscript-metadata.mjs';
import {privateContent,publicIdentity} from '../scripts/public-audit.mjs';
test('stable update metadata preserves script identity without runtime code or credentials',()=>{
 const text=metadata(readFileSync('src/userscript-header.txt','utf8'),'2.0.1');
 assert.match(text,/@version\s+2\.0\.1/);assert.match(text,/@name\s+Emulingo Lexirise/);assert.match(text,/@namespace\s+emulingo-lexirise/);
 assert(text.includes(downloadURL)&&text.includes(updateURL));assert(!text.includes('function('));
 for(const url of [downloadURL,updateURL]){const parsed=new URL(url);assert.equal(parsed.protocol,'https:');assert.equal(parsed.username,'');assert.equal(parsed.search,'');}
 assert.throws(()=>metadata(text,'invalid'));assert.throws(()=>metadata(text.replace(updateURL,'http://invalid'),'2.0.1'));
});
test('privacy audit rejects private profiles, secret-shaped values and personal identities',()=>{
 assert(privateContent('C:'+String.fromCharCode(92)+'Users'+String.fromCharCode(92)+'example'+String.fromCharCode(92)+'capture'));
 assert(privateContent('lx_'+'x'.repeat(60)));assert(!privateContent(readFileSync('README.md','utf8')));
 assert(!publicIdentity('person@example.org'));assert(publicIdentity('123+example@users.noreply.github.com'));
});

