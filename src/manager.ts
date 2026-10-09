type Reply = { status: number; responseText?: string; response?: unknown; responseHeaders?: string };
type Details = { url: string; method: string; headers: Record<string,string>; data?: string; timeout: number; responseType: string; onload?: (r:Reply)=>void; onerror?: ()=>void; ontimeout?: ()=>void };
type RequestHandle = {abort?:()=>void} & Partial<Promise<Reply>>;
declare global {
  var GM: { getValue<T>(key:string, fallback?:T):Promise<T>; setValue(key:string,value:unknown):Promise<void>; deleteValue(key:string):Promise<void>; xmlHttpRequest(details:Details):RequestHandle } | undefined;
  var GM_xmlhttpRequest: ((details:Details)=>RequestHandle) | undefined;
  var GM_getValue: (<T>(key:string,fallback?:T)=>T) | undefined;
  var GM_setValue: ((key:string,value:unknown)=>void) | undefined;
  var GM_deleteValue: ((key:string)=>void) | undefined;
}
export async function getValue<T>(key:string, fallback:T):Promise<T> {
  const manager=typeof GM!=='undefined'?GM:globalThis.GM;
  if (manager?.getValue) return await manager.getValue(key,fallback);
  if (typeof GM_getValue==='function') return GM_getValue(key,fallback);
  throw new Error('Enable Userscripts, Tampermonkey, or Violentmonkey to store Lexirise settings.');
}
export async function setValue(key:string,value:unknown) {
  if(typeof GM!=='undefined'&&GM?.setValue){await GM.setValue(key,value);return;}
  if(typeof GM_setValue==='function'){GM_setValue(key,value);return;}
  throw new Error('The userscript manager cannot save settings. Check the script permissions.');
}
export async function deleteValue(key:string) {
  if(typeof GM!=='undefined'&&GM?.deleteValue){await GM.deleteValue(key);return;}
  if(typeof GM_deleteValue==='function'){GM_deleteValue(key);return;}
  throw new Error('The userscript manager cannot remove saved settings. Check the script permissions.');
}
export function managerRequest(url:string, method:string, key:string, payload?:unknown):Promise<Reply> {
  return new Promise((resolve,reject)=>{
    const manager=typeof GM!=='undefined'?GM:globalThis.GM;
    const send = manager?.xmlHttpRequest?.bind(manager) || (typeof GM_xmlhttpRequest!=='undefined'?GM_xmlhttpRequest:globalThis.GM_xmlhttpRequest);
    if (!send) { reject(new Error('Enable the userscript manager’s cross-origin request permission.')); return; }
    const handle=send({url,method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},data:payload===undefined?undefined:JSON.stringify(payload),timeout:65000,responseType:'text',onload:resolve,onerror:()=>reject(new Error('Could not reach Lexirise. Check your connection and userscript extension permissions.')),ontimeout:()=>reject(new Error('Lexirise timed out. Please retry.'))});
    // Userscripts returns an abortable Promise; Tampermonkey also supports callbacks.
    if (typeof handle?.then==='function') handle.then(resolve,reject);
  });
}
