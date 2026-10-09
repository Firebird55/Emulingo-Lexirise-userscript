export const repository='https://github.com/Firebird55/Emulingo-Lexirise-userscript';
export const downloadURL=repository+'/releases/latest/download/emulingo-lexirise.user.js';
export const updateURL=repository+'/releases/latest/download/emulingo-lexirise.meta.js';
export function metadata(template,version){
 if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version))throw new Error('Invalid userscript version');
 const header=template.replace(/(@version\s+)\S+/,(_,prefix)=>prefix+version).trim()+'\n';
 for(const[name,url]of [['updateURL',updateURL],['downloadURL',downloadURL]]){
  if(!header.includes('@'+name+'    '+url))throw new Error('Unexpected '+name+' channel');
 }
 if(!header.startsWith('// ==UserScript==')||!header.endsWith('// ==/UserScript==\n'))throw new Error('Invalid metadata block');
 return header;
}

