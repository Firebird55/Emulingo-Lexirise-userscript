import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {pinyinSyllableToZhuyin,wordZhuyin} from '../src/zhuyin';
import {mockApi,sample} from './mock-api.mjs';
import {countUnknownWords,shouldHideTranslation} from '../src/translation-visibility';
import {enabled,toneStyle,DEFAULT_READING_OPTIONS,resetReadingCaches} from '../src/reading-text';
import {normalizeReading,normalizeGrammar,normalizeLookup,initializeClient,requestReading,configureKey,testConnection,analyze} from '../src/reading-client';
import {managerRequest} from '../src/manager';
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://emulingo.com/play'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,DOMParser:dom.window.DOMParser,Event:dom.window.Event,CustomEvent:dom.window.CustomEvent,HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,__LEXIRISE_TEST__:true});
const storage=new Map<string,any>([['lexirise:key','test-key']]);
let calls:Array<{method:string,path:string,body:any}>=[],status=200,unconfirmed=false;
let customReply:((method:string,path:string,body:any)=>any)|null=null;
globalThis.GM={getValue:async(key,fallback)=>storage.has(key)?storage.get(key):fallback,setValue:async(key,value)=>{storage.set(key,value);},deleteValue:async key=>{storage.delete(key);},xmlHttpRequest:details=>{
  const path=new URL(details.url).pathname,body=details.data?JSON.parse(details.data):{};calls.push({method:details.method,path,body});
  const result=status===200?(unconfirmed?{item:{}}:customReply?customReply(details.method,path,body):mockApi(details.method,path,body)):{};
  return Promise.resolve({status,responseText:JSON.stringify(result)});
}};
await initializeClient();
test('Zhuyin converts tones, contracted finals, ü, and apical i; refuses invalid readings',()=>{
  for(const [pinyin,expected] of [['zhǎo','ㄓㄠˇ'],['nǐ','ㄋㄧˇ'],['hǎo','ㄏㄠˇ'],['jué','ㄐㄩㄝˊ'],['qún','ㄑㄩㄣˊ'],['shuǐ','ㄕㄨㄟˇ'],['liú','ㄌㄧㄡˊ'],['shì','ㄕˋ'],['yuán','ㄩㄢˊ'],['yǒng','ㄩㄥˇ'],['wēng','ㄨㄥ'],['nǚ','ㄋㄩˇ'],['lüe4','ㄌㄩㄝˋ'],['de','ㄉㄜ˙']])assert.equal(pinyinSyllableToZhuyin(pinyin),expected,pinyin);
  assert.equal(wordZhuyin('péng you',[2,5],'朋友'),'ㄆㄥˊ ㄧㄡ˙');assert.equal(wordZhuyin('nǐ',[3],'你好'),'');assert.equal(pinyinSyllableToZhuyin('invalid!'),'');
  assert.equal(wordZhuyin('bóshì',[2,4],'博士'),'ㄅㄛˊ ㄕˋ');assert.equal(wordZhuyin('zhèngzài',[4,4],'正在'),'ㄓㄥˋ ㄗㄞˋ');assert.equal(wordZhuyin('gébì',[2,4],'隔壁'),'ㄍㄜˊ ㄅㄧˋ');assert.equal(wordZhuyin('péngyou',[2,5],'朋友'),'ㄆㄥˊ ㄧㄡ˙');assert.equal(wordZhuyin('xīān',[1,1],'西安'),'ㄒㄧ ㄢ');
});
test('scope controls reader and lookup default, and maps all five tone colors',()=>{
  assert.equal(DEFAULT_READING_OPTIONS.zhuyin,'off');assert.equal(enabled('off',true),false);assert.equal(enabled('unknown',false),false);assert.equal(enabled('unknown',true),true);assert.equal(enabled('all',false),true);
  for(let tone=1;tone<=5;tone++)assert.equal(toneStyle([tone],'找',DEFAULT_READING_OPTIONS.palette)?.color,DEFAULT_READING_OPTIONS.palette[tone-1]);
  assert.match(toneStyle([2,4],'隔壁',DEFAULT_READING_OPTIONS.palette)?.backgroundImage||'',/#ffd34d.*#4fa8ff/);
});
test('UTF-16 offsets keep repeated words separate and reject surrogate splits/mismatched text',()=>{
  const text='😀朋友，朋友';const result={occurrences:[{word:'朋友',isWordLike:true,charStart:2,charEnd:4,entryId:1,transliteration:'péng you',tones:[2,5]},{word:'朋友',isWordLike:true,charStart:5,charEnd:7,entryId:1,transliteration:'péng you',tones:[2,5]},{word:'wrong',isWordLike:true,charStart:0,charEnd:1}],stateByEntryId:{1:{proficiency:4}},entryMetaById:{}};
  const reading=normalizeReading(text,result);assert.deepEqual(reading.tokens.map(t=>t.start),[2,5]);assert.equal(countUnknownWords(text,reading.tokens),0);
  assert.equal(countUnknownWords(text,[reading.tokens[0]]),null);assert.equal(shouldHideTranslation(0,null),false);
  assert.equal(countUnknownWords('朋友朋友',normalizeReading('朋友朋友',{...result,occurrences:[{...result.occurrences[0],charStart:0,charEnd:2},{...result.occurrences[1],charStart:2,charEnd:4}],stateByEntryId:{1:{proficiency:3}}}).tokens),2);
});
test('grammar normalization groups rules and keeps the selected token anchors',()=>{
  const raw={occurrences:[{charStart:0,charEnd:2},{charStart:3,charEnd:5}],grammar:[{slug:'rule',title:'朋友',indices:[0]},{slug:'rule',indices:[1]},{slug:'bad',indices:[99]}],grammarStates:{rule:2}};
  const rules=normalizeGrammar('朋友，朋友',raw,{rule:4});assert.equal(rules.length,1);assert.equal(rules[0].spans.length,2);assert.equal(rules[0].proficiency,4);assert.equal(rules[0].localOverride,true);
});
test('dictionary parser preserves all senses and safely extracts list and plain HTML',()=>{
  const raw=mockApi('POST','/v1/dictionary/lookup',{text:'找'});raw.supplementalEntries.push({dictionary_name:'Plain',html:'<script>alert(1)</script><p>plain meaning</p>'});
  const lookup=normalizeLookup(raw);assert.equal(lookup.translations.length,2);assert.deepEqual(lookup.dictionaries[0].definitions,['first supplemental definition','second supplemental definition']);assert.deepEqual(lookup.dictionaries[1].definitions,['plain meaning']);assert.equal(lookup.components.length,2);
});
test('direct client deduplicates analysis, passes correct occurrence offsets, and writes only explicit actions',async()=>{
  calls=[];await Promise.all([analyze(sample),analyze(sample)]);assert.equal(calls.filter(c=>c.path==='/v1/analyze/text').length,1);assert.equal(calls.some(c=>c.path==='/v1/vocabulary'),false);
  const token=(await analyze(sample)).tokens.find(t=>t.word==='找')!;await requestReading(sample,'context',{start:token.start});assert.equal(calls.at(-1)?.body.charStart,token.start);assert.equal(calls.at(-1)?.body.charEnd,token.end);
  const created=await (await requestReading(sample,'proficiency',{}, {body:JSON.stringify({start:token.start,proficiency:4})})).json();assert.equal(created.proficiency,4);
  await requestReading(sample,'proficiency',{}, {body:JSON.stringify({start:token.start,proficiency:2})});assert.equal(calls.at(-1)?.method,'PATCH');assert.match(calls.at(-1)?.path||'',/^\/v1\/vocabulary\/\d+$/);assert.equal((await analyze(sample)).tokens.find(t=>t.word==='找')?.proficiency,2);
  await requestReading(sample,'grammar',{}, {body:JSON.stringify({slug:'zhengzai',known:true})});assert.equal(storage.get('lexirise:grammar:zh').zhengzai,4);
  const examples=await (await requestReading(sample,'examples',{start:token.start})).json();assert.equal(examples.examples.length,1);
  await requestReading(sample,'save-example',{start:token.start,index:0},{method:'POST'});assert.equal(calls.at(-1)?.body.mode,'sentence');
});
test('similar words are dictionary verified and direct components do not recurse',async()=>{
  const token=(await analyze(sample)).tokens.find(t=>t.word==='找')!;
  const result=await (await requestReading(sample,'similar',{start:token.start})).json();assert.equal(result.suggestions.length,3);assert.equal(result.generated,true);
  const parts=await (await requestReading(sample,'characters',{start:token.start})).json();assert.equal(parts.characters[0].components.length,2);assert.ok(parts.characters[0].components[0].pinyin.length);
});
test('pending full analysis is retried instead of cached as complete',async()=>{
  const text='朋友正在找朋友。';let pendingFull=true;calls=[];
  customReply=(method,path,body)=>{const result=mockApi(method,path,body);return path==='/v1/analyze/text'?{...result,morphoPending:pendingFull}:result;};
  assert.equal((await analyze(text)).analysisPending,true);pendingFull=false;
  assert.equal((await analyze(text)).analysisPending,false);await analyze(text);
  assert.equal(calls.filter(c=>c.path==='/v1/analyze/text').length,2);customReply=null;
});
test('unconfirmed writes, invalid key, missing key, and rate limit fail without claiming success',async()=>{
  const token=(await analyze(sample)).tokens.find(t=>t.word==='博士')!;unconfirmed=true;
  await assert.rejects(requestReading(sample,'proficiency',{}, {body:JSON.stringify({start:token.start,proficiency:4})}),/did not confirm/);unconfirmed=false;
  status=401;await assert.rejects(testConnection(),/rejected the key/);status=429;await assert.rejects(testConnection(),/request limit/);status=200;
  await configureKey('');assert.equal(storage.has('lexirise:key'),false);await assert.rejects(testConnection(),/Add your Lexirise/);await configureKey('test-key');resetReadingCaches();
});
test('manager request supports callback-only desktop APIs as well as Safari Promise APIs',async()=>{
  const previous=GM!.xmlHttpRequest;
  GM!.xmlHttpRequest=details=>{queueMicrotask(()=>details.onload?.({status:200,responseText:'{}'}));return {abort:()=>{}};};
  assert.equal((await managerRequest('https://api.lexirise.app/v1/me','GET','test-key')).status,200);GM!.xmlHttpRequest=previous;
});
test('manager APIs work when Safari injects lexical GM without a window.GM property',async()=>{
  const bundled=readFileSync('.test-build/manager.js','utf8');
  const sandbox={injectedManager:GM};
  const value=runInNewContext(`(function(GM){${bundled}; return managerApi.getValue('lexirise:key','missing');})(injectedManager)`,sandbox);
  assert.equal(await value,'test-key');assert.equal('GM' in sandbox,false);
});
test('legacy desktop manager globals support storage and callback transport without GM',async()=>{
  const bundled=readFileSync('.test-build/manager.js','utf8');
  const values=new Map<string,unknown>();
  const sandbox={GM_getValue:(k:string,f:unknown)=>values.has(k)?values.get(k):f,GM_setValue:(k:string,v:unknown)=>values.set(k,v),GM_deleteValue:(k:string)=>values.delete(k),GM_xmlhttpRequest:(d:any)=>{d.onload({status:200,responseText:'{}'});return {abort:()=>{}};}};
  const api=runInNewContext(`${bundled}; managerApi`,sandbox);
  assert.equal(await api.getValue('key','missing'),'missing');await api.setValue('key','fixture-key');assert.equal(await api.getValue('key','missing'),'fixture-key');await api.deleteValue('key');assert.equal(await api.getValue('key','missing'),'missing');
  assert.equal((await api.managerRequest('https://api.lexirise.app/v1/me','GET','fixture-key')).status,200);
});
test('native pinyin/chips are suppressed even without a key; only expanded Mandarin source lines are selected',async()=>{
  const {suppressNative,findMandarinLines}=await import('../src/main');
  document.body.innerHTML='<div class="translation-feed"><div class="translation-item"><p class="text-tr-sm">你好</p><p class="text-tr-sm italic">nǐ hǎo</p><p class="text-tr-lg">Hello</p><div><button aria-label="Save 你好 to vocab">+ 你好</button></div><button aria-label="Play pronunciation">Play</button></div><div class="translation-item"><p class="truncate text-tr-sm">朋友</p></div></div>';
  const feed=document.querySelector('.translation-feed')!;suppressNative(feed);assert.equal(document.querySelectorAll('[data-lx-native-pinyin]').length,1);assert.equal(document.querySelectorAll('[data-lx-vocab]').length,1);assert.equal(findMandarinLines(feed).length,1);assert.equal(document.querySelector('button[aria-label="Play pronunciation"]')?.hasAttribute('data-lx-vocab'),false);
  document.querySelector('.translation-item')!.insertAdjacentHTML('beforeend','<p class="text-tr-xl italic">péng you</p>');suppressNative(feed);assert.equal(document.querySelectorAll('[data-lx-native-pinyin]').length,2);
  const reused=document.querySelector<HTMLElement>('[data-lx-native-pinyin]')!;reused.classList.remove('italic');reused.textContent='你好';suppressNative(feed);assert.equal(reused.hasAttribute('data-lx-native-pinyin'),false);
});
