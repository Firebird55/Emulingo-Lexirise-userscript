import { createRoot, type Root } from 'react-dom/client';
import { useCallback, useState } from 'react';
import { ReadingText, resetReadingCaches } from './reading-text';
import { SettingsPanel, loadSettings, DEFAULT_SETTINGS, type Settings } from './settings';
import { initializeClient } from './reading-client';
import { shouldHideTranslation, type ReadingSummary } from './translation-visibility';
import { setPortalContainer } from './portal';
import readerCss from '@firebird55/lexirise-components/styles.css';
import {isStudyLanguage, type StudyLanguage} from '@firebird55/lexirise-components';

const MARKER='data-emulingo-lexirise';
// Query parameters (including second-screen pairing codes) never gate support.
export function isSupportedPage(pathname:string){return /^\/(?:play|panel)(?:\/|$)/.test(pathname);}
export function settingsAnchors(scope:ParentNode=document,pathname=location.pathname):HTMLButtonElement[]{
 const anchors=[...scope.querySelectorAll<HTMLButtonElement>('#app button[aria-label="Open settings"]')];
 if(/^\/panel(?:\/|$)/.test(pathname)){
  for(const button of scope.querySelectorAll<HTMLButtonElement>('#app nav[aria-label="Second screen views"] button')){
   if(button.textContent?.trim()==='Settings')anchors.push(button);
  }
 }
 return [...new Set(anchors)];
}
type Line={id:number,text:string,language:StudyLanguage,source:HTMLElement,host:HTMLElement,root:Root,english?:HTMLElement};
const nativeCss=`
.translation-feed [data-lx-native-pinyin],.translation-feed [data-lx-vocab],.translation-feed [data-lx-original],.translation-feed [data-lx-english-hidden] { display:none!important; }
.lexirise-settings-button { flex:none!important; cursor:pointer; }
.lexirise-settings-button svg { pointer-events:none; }
.translation-feed,.translation-feed .translation-item,.translation-feed .translation-regions { min-width:0; }
.translation-feed [data-lx-reader] { display:block!important; min-width:0!important; max-width:100%!important; white-space:normal!important; overflow-wrap:anywhere!important; }
.translation-feed .translation-item p { overflow-wrap:anywhere; }
.lexirise-settings-button { min-width:40px; min-height:40px; }
.translation-feed [data-lx-reader] { width:100%!important; }
[data-lx-controls] { min-width:0; flex-wrap:wrap; }
@media (max-width:560px) { .translation-feed .translation-actions { flex-wrap:wrap; } }
.lexirise-english-reveal { background:transparent; border:1px dashed #8798aa; border-radius:5px; padding:5px 9px; color:#a9c9dc; font-size:12px; cursor:pointer; }
`;
export function suppressNative(feed:Element){
  for(const p of feed.querySelectorAll<HTMLElement>('[data-lx-native-pinyin]')) {
    if(!p.classList.contains('italic')||![...p.classList].some(c=>c.startsWith('text-tr-')))delete p.dataset.lxNativePinyin;
  }
  for(const p of feed.querySelectorAll<HTMLElement>('.translation-item p.italic')) {
    if([...p.classList].some(c=>c.startsWith('text-tr-')))p.dataset.lxNativePinyin='';
  }
  for(const button of feed.querySelectorAll<HTMLButtonElement>('.translation-item button[aria-label]')){
    if(/^(Save .+ to vocab|.+ saved to vocab)$/.test(button.getAttribute('aria-label')||''))button.parentElement!.dataset.lxVocab='';
  }
}
let languageOverride:Settings['sourceLanguage']='auto';
export function contentLanguage(source:HTMLElement):StudyLanguage|null{
 if(languageOverride&&languageOverride!=='auto')return languageOverride;
 const owner=source.closest<HTMLElement>('[data-content-language],[data-source-language],[data-language],.translation-item[lang],.translation-feed[lang]');
 const code=source.getAttribute('lang')||owner?.dataset.contentLanguage||owner?.dataset.sourceLanguage||owner?.dataset.language||owner?.getAttribute('lang');
 if(code){const normalized=code.toLowerCase().split('-')[0];if(isStudyLanguage(normalized))return normalized;}
 // Preserve pre-language-metadata Mandarin cards. Other languages require an explicit override.
 return /\p{Script=Han}/u.test(source.textContent||'')?'zh':null;
}
export function findMandarinLines(feed:Element):HTMLElement[]{
  return [...feed.querySelectorAll<HTMLElement>('.translation-item p.text-tr-sm')].filter(p=>!p.classList.contains('italic')&&!p.classList.contains('truncate')&&!!contentLanguage(p));
}
function findEnglish(source:HTMLElement):HTMLElement|undefined{
  let node=source.nextElementSibling;
  while(node){
    if(node instanceof HTMLElement && node.tagName==='P' && !node.classList.contains('italic'))return node;
    if(node.tagName==='P'&&node.classList.contains('text-tr-sm')&&!node.classList.contains('italic'))break;
    node=node.nextElementSibling;
  }
  return undefined;
}
function mountShadow(host:HTMLElement){
  const shadow=host.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=readerCss;shadow.append(style);
  const content=document.createElement('div');shadow.append(content);return {shadow,content};
}
function protectOverlayHost(host:HTMLElement){
  const styles:Record<string,string>={display:'block',position:'fixed',inset:'0',zIndex:'2147483647',pointerEvents:'none',overflow:'visible',visibility:'visible',opacity:'1',transform:'none',filter:'none',contain:'none'};
  for(const [property,value] of Object.entries(styles))host.style.setProperty(property.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`),value,'important');
}
function eventPathMatches(event:Event,selector:string){
  return event.composedPath().some(node=>{
    const candidate=node as Element;
    return typeof candidate.matches==='function'&&candidate.matches(selector);
  });
}
function LineView({line,settings,revision}:{line:Line,settings:Settings,revision:number}){
  const [summary,setSummary]=useState<ReadingSummary|null>(null);
  const [revealed,setRevealed]=useState(false);
  const onSummary=useCallback((value:ReadingSummary)=>setSummary(value),[]);
  const hide=!revealed&&summary?.text===line.text&&shouldHideTranslation(settings.hideEnglishAt,summary.unknownWords);
  // English remains the native node so native card actions continue to work.
  if(line.english){if(hide)line.english.dataset.lxEnglishHidden='';else delete line.english.dataset.lxEnglishHidden;}
  return <><ReadingText key={`${revision}:${line.text}`} id={line.id} text={line.text} current sourceLanguage={line.language} translationLanguage={settings.translationLanguage??'en'} options={settings} onSummary={onSummary}/>
    {hide&&<button className="lexirise-english-reveal" type="button" onClick={e=>{e.stopPropagation();setRevealed(true);}}>Show English translation</button>}</>;
}
export async function start(){
  if(document.documentElement.hasAttribute(MARKER))return;
  document.documentElement.setAttribute(MARKER,'1');
  let settings:Settings=DEFAULT_SETTINGS,revision=0,nextId=1,ready=false;
  const lines=new Map<HTMLElement,Line>();
  const style=document.createElement('style');style.dataset.lxGlobal='';style.textContent=nativeCss;document.head.append(style);
  const overlayHost=document.createElement('div');overlayHost.dataset.lxOverlay='';protectOverlayHost(overlayHost);document.documentElement.append(overlayHost);
  const overlay=mountShadow(overlayHost);setPortalContainer(overlay.content);
  const settingsHost=document.createElement('div');settingsHost.style.pointerEvents='none';overlay.shadow.append(settingsHost);const settingsRoot=createRoot(settingsHost);
  const onClose=()=>settingsRoot.render(null);
  function render(line:Line){line.host.style.setProperty('--lexirise-font-size',settings.fontSize+'px');line.root.render(<LineView key={`${revision}:${line.text}`} line={line} settings={settings} revision={revision}/>);}
  function update(next:Settings){settings=next;languageOverride=next.sourceLanguage;revision++;resetReadingCaches();scan();for(const line of lines.values())render(line);}
  function showSettings(){
    // Render first: Firefox can reject page-world events dispatched from an isolated userscript world.
    settingsRoot.render(<SettingsPanel initial={settings} sourceLanguage={settings.sourceLanguage&&settings.sourceLanguage!=='auto'?settings.sourceLanguage:[...lines.values()][0]?.language??'zh'} onChange={update} onClose={onClose}/>);
    try{window.dispatchEvent(new CustomEvent('lexirise-open-word',{detail:-1}));}
    catch(error){console.warn('Emulingo Lexirise: could not close the word popup.',error);}
  }
  document.addEventListener('click',event=>{
    if(!eventPathMatches(event,'.lexirise-settings-button'))return;
    event.preventDefault();event.stopPropagation();showSettings();
  },true);
  function syncButtons(){
    for(const button of settingsAnchors()){
      if(!button.closest('#app')||button.nextElementSibling?.classList.contains('lexirise-settings-button'))continue;
      const added=document.createElement('button');added.type='button';added.className=button.className+' lexirise-settings-button';added.setAttribute('aria-label','Open Lexirise settings');added.title='Lexirise reading options';
      added.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h7a3 3 0 0 1 3 3v13a4 4 0 0 0-4-2H4zM20 4h-3a3 3 0 0 0-3 3v13a4 4 0 0 1 4-2h2z"/><path d="M7 8h3M7 11h3M17 8h1M17 11h1"/></svg>';
      button.after(added);
      button.parentElement?.setAttribute('data-lx-controls','');
    }
  }
  const viewportObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;const source=entry.target as HTMLElement;viewportObserver.unobserve(source);enhance(source);}
  },{rootMargin:'160px'});
  function enhance(source:HTMLElement){
    if(!isSupportedPage(location.pathname)||!source.isConnected||lines.has(source)||!ready)return;
    const text=source.textContent||'';const host=document.createElement('span');host.dataset.lxReader='';
    const english=findEnglish(source);const {content}=mountShadow(host);const line:Line={id:nextId++,text,language:contentLanguage(source)??'zh',source,host,english,root:createRoot(content)};
    lines.set(source,line);source.after(host);source.dataset.lxOriginal='';render(line);
  }
  function scan(){
    const active=isSupportedPage(location.pathname);
    for(const [source,line]of lines){
      if(!active||!source.isConnected||!line.host.isConnected||!contentLanguage(source)){
        line.root.unmount();line.host.remove();delete source.dataset.lxOriginal;if(line.english)delete line.english.dataset.lxEnglishHidden;lines.delete(source);continue;
      }
      if(line.text!==source.textContent||line.language!==contentLanguage(source)){line.language=contentLanguage(source)!;line.text=source.textContent||'';if(line.english)delete line.english.dataset.lxEnglishHidden;line.english=findEnglish(source);render(line);}
    }
    if(!active)return;
    syncButtons();
    for(const feed of document.querySelectorAll('.translation-feed')){
      suppressNative(feed);
      if(ready)for(const source of findMandarinLines(feed))if(!lines.has(source))viewportObserver.observe(source);
    }
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});scan();
  try{await initializeClient();settings=await loadSettings();languageOverride=settings.sourceLanguage;}catch(e){console.warn('Emulingo Lexirise:',e instanceof Error?e.message:'Userscript manager unavailable.');}
  ready=true;scan();
  window.addEventListener('lexirise-credentials-changed',()=>{revision++;resetReadingCaches();for(const line of lines.values())render(line);});
  window.addEventListener('lexirise-account-settings',()=>{revision++;resetReadingCaches();for(const line of lines.values())render(line);});
  window.addEventListener('popstate',scan);
  document.addEventListener('keydown',e=>{if(eventPathMatches(e,'[data-lx-overlay]'))e.stopPropagation();});
}
if(typeof document!=='undefined' && !globalThis.__LEXIRISE_TEST__)void start();
