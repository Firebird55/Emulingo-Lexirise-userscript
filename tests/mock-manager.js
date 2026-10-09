// Fixture only. This file is never bundled into the userscript.
const stored=new Map(new URLSearchParams(location.search).has('no-key')?[]:[['lexirise:key','fixture-key']]);
if(new URLSearchParams(location.search).has('hide-english'))stored.set('lexirise:settings',{hideEnglishAt:3});
window.GM={getValue:async(k,f)=>stored.has(k)?stored.get(k):f,setValue:async(k,v)=>{stored.set(k,v);},deleteValue:async k=>{stored.delete(k);},xmlHttpRequest:d=>{
  const controller=new AbortController();const request=fetch('/fixture-api'+new URL(d.url).pathname,{method:d.method,headers:{'Content-Type':'application/json'},body:d.data,signal:controller.signal}).then(async r=>({status:r.status,responseText:await r.text()}));request.abort=()=>controller.abort();return request;
}};
// Exercise the callback-only, legacy desktop manager path through the full bundle.
if(new URLSearchParams(location.search).get('manager')==='legacy'){
  const manager=window.GM;
  window.GM_getValue=(k,f)=>stored.has(k)?stored.get(k):f;
  window.GM_setValue=(k,v)=>{stored.set(k,v);};
  window.GM_deleteValue=k=>{stored.delete(k);};
  window.GM_xmlhttpRequest=d=>{const request=manager.xmlHttpRequest(d);request.then(d.onload,d.onerror);return {abort:()=>request.abort()};};
  delete window.GM;
}
