
'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { capabilities, studyLanguages, translationLanguages, type StudyLanguage } from './capabilities.js';
import { globalFields, languageFields, settingsPatch, validateAccount, type AccountSettings, type JsonObject, type SettingsAdapter } from './account.js';
import { DEFAULT_READING_OPTIONS, MIGAKU_TONE_PALETTE, restoreReadingOptions, type ReadingOptions, type ReadingScope } from './reader.js';
import { restoreTranslationLimit } from './translation-visibility.js';
export type LocalSettings = ReadingOptions & {fontSize?:number; sourceLanguage?:StudyLanguage|'auto'; translationLanguage?:string};
export function restoreLocalSettings(value:unknown):LocalSettings {
 const saved=value as Partial<LocalSettings>|null;
 return {...restoreReadingOptions(value),fontSize:typeof saved?.fontSize==='number'&&saved.fontSize>=18&&saved.fontSize<=48?saved.fontSize:27,
 sourceLanguage:saved?.sourceLanguage==='auto'||(saved?.sourceLanguage&&saved.sourceLanguage in capabilities)?saved.sourceLanguage:'auto',
 translationLanguage:translationLanguages.includes(saved?.translationLanguage as any)?saved!.translationLanguage:'en'};
}
const labels:Record<string,string>={pinyin:'Pronunciation readings',zhuyin:'Zhuyin',toneMarks:'Separate tone marks',meanings:'Inline glosses',toneColors:'Tone colors'};
const choices:Record<string,readonly string[]>={interfaceLanguage:['translation','device',...translationLanguages],translationLanguage:translationLanguages,wordPopupOpenMode:['click','hover'],inlineGlossMode:['off','unknown','all'],coloringMode:['learning_state','tone'],toneColorPreset:['lexirise','pleco','migaku','custom'],wordSpacing:['none','sm','md','lg'],fontSize:['sm','md','lg'],script:['simplified','traditional']};
function Field({name,value,onChange,options}:{name:string,value:any,onChange:(v:any)=>void,options?:readonly string[]}) {
 const [raw,setRaw]=useState(JSON.stringify(value??null,null,2));const [invalid,setInvalid]=useState(false);
 useEffect(()=>{setRaw(JSON.stringify(value??null,null,2));setInvalid(false);},[value]);
 if((value&&typeof value==='object')||['wordPopup','customToneColors','customProficiencyColors','dictionaries'].includes(name)) return <label className="reader-option-row"><span>{name}<small>Structured setting, validated by Lexirise when saved.</small></span><textarea aria-label={name} value={raw} onChange={e=>{setRaw(e.target.value);try{const next=JSON.parse(e.target.value);onChange(next);setInvalid(false);}catch{setInvalid(true);}}} aria-invalid={invalid}/>{invalid&&<small>Invalid JSON — this edit has not been applied.</small>}</label>;
 const values=options??choices[name];
 return <label className="reader-option-row"><span><strong>{name.replace(/([A-Z])/g,' $1')}</strong></span>
 {typeof value==='boolean'?<input type="checkbox" checked={value} aria-label={name} onChange={e=>onChange(e.target.checked)}/>:
 values?<select aria-label={name} value={value??''} onChange={e=>onChange(e.target.value||null)}><option value="">Default</option>{[...new Set([...values,...(value?[String(value)]:[])])].map(option=><option key={option}>{option}</option>)}</select>:
 <input aria-label={name} type={typeof value==='number'?'number':'text'} value={value??''} onChange={e=>onChange(typeof value==='number'?Number(e.target.value):e.target.value)}/>}</label>;
}
export function SettingsPanel({initial,onChange,onClose,adapter,connection,sourceLanguage='zh',sourceOverride=false}:{initial:LocalSettings;onChange:(settings:LocalSettings)=>void|Promise<void>;onClose:()=>void;adapter:SettingsAdapter;connection?:ReactNode;sourceLanguage?:StudyLanguage;sourceOverride?:boolean}) {
 const [local,setLocal]=useState(initial),[original,setOriginal]=useState<AccountSettings|null>(null),[draft,setDraft]=useState<AccountSettings|null>(null),[editing,setEditing]=useState<StudyLanguage>(sourceLanguage),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function reload(){setBusy(true);setMessage('');try{const result=validateAccount(await adapter.load());setOriginal(result);setDraft(structuredClone(result));}catch(e){setMessage(e instanceof Error?e.message:'Could not load settings.');}finally{setBusy(false);}}
 useEffect(()=>{void reload();},[adapter]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose();}};window.addEventListener('keydown',key,true);const connected=()=>void reload();window.addEventListener('lexirise-credentials-changed',connected);return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('lexirise-credentials-changed',connected);};},[onClose,adapter]);
 function updateLocal(next:LocalSettings){setLocal(next);Promise.resolve(onChange(next)).catch(()=>setMessage('Could not save local display preferences.'));}
 function updateGlobal(key:string,value:any){setDraft(d=>d?{...d,global:{...d.global,[key]:value}}:d);}
 function updateLanguage(key:string,value:any){setDraft(d=>d?{...d,languageSettings:{...d.languageSettings,[editing]:{...d.languageSettings[editing],[key]:value}}}:d);}
 async function save(){if(!original||!draft)return;setBusy(true);setMessage('');try{const patch=settingsPatch(original,draft);if(!Object.keys(patch).length){setMessage('No account changes.');return;}const result=validateAccount(await adapter.patch(patch));setOriginal(result);setDraft(structuredClone(result));setMessage('Saved to Lexirise.');}catch(e){setMessage(e instanceof Error?e.message:'Could not save account settings. Your changes are still here.');}finally{setBusy(false);}}
 const cap=capabilities[editing],source=capabilities[sourceLanguage];
 const languageView:JsonObject={readingAid:cap.readings[1]??null,readingAboveWords:cap.readings.length?true:null,script:cap.scripts[0]??null,
 inlineGlossMode:'off',coloringMode:'learning_state',toneColorPreset:cap.tones?'lexirise':null,customToneColors:cap.tones?null:undefined,colorKnownWordsToo:false,emphasizeFrequencyLevel:0,wordSpacing:'md',ttsOnWordClick:cap.tts,automaticGrammarHighlighting:cap.grammar?false:null,highlightProperNouns:true,customFont:'',fontSize:'md',segmentByCharacter:cap.characters?false:null,dictionariesEnabled:true,dictionaries:[],wordPopup:null,...draft?.languageSettings[editing]};
 return <div className="settings-backdrop" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="Lexirise reading options" onKeyDown={e=>e.stopPropagation()}>
 <button className="settings-close" type="button" aria-label="Close Lexirise settings" onClick={onClose}>×</button>
 <h2>Lexirise reading options</h2><p className="settings-description">Local display changes apply immediately. Account changes require Save to Lexirise. Editing another study language does not change this transcript's language.</p>
 <fieldset><legend>Local display only</legend>
 {sourceOverride&&<><Field name="Content source language" value={local.sourceLanguage??'auto'} options={['auto',...studyLanguages]} onChange={v=>updateLocal({...local,sourceLanguage:v})}/><Field name="Lookup translation language" value={local.translationLanguage??'en'} options={translationLanguages} onChange={v=>updateLocal({...local,translationLanguage:v})}/></>}
 <label className="reader-option-row"><span><strong>Hide English translation</strong><small>Hide translations at this unknown-word threshold; tap to reveal.</small></span><select aria-label="Hide English translation" value={local.hideEnglishAt} onChange={e=>updateLocal({...local,hideEnglishAt:restoreTranslationLimit(e.target.value==='off'?'off':Number(e.target.value))})}><option value="off">Always show</option>{[0,1,2,3].map(n=><option key={n} value={n}>{n} or fewer unknown words</option>)}</select></label>
 {Object.entries(labels).filter(([key])=>key==='meanings'||key==='pinyin'&&source.readings.length||key==='zhuyin'&&sourceLanguage==='zh'||['toneMarks','toneColors'].includes(key)&&source.tones).map(([key,label])=><label className="reader-option-row" key={key}><span><strong>{label}</strong></span><select aria-label={label} value={local[key as keyof ReadingOptions] as string} onChange={e=>updateLocal({...local,[key]:e.target.value as ReadingScope})}><option value="unknown">Unknown words</option><option value="all">All words</option><option value="off">Off</option></select></label>)}
 <Field name="Local text size" value={local.fontSize??27} onChange={v=>{if(v>=18&&v<=48)updateLocal({...local,fontSize:v});}}/>
 {!!source.tones&&<fieldset className="reader-tone-palette"><legend>Local tone palette</legend><div className="reader-color-list">{Array.from({length:source.tones},(_,i)=><label key={i}><input type="color" aria-label={'Tone '+(i+1)+' color'} value={local.palette[i]??'#c084fc'} onChange={e=>{const palette=[...local.palette] as LocalSettings['palette'];palette[i]=e.target.value;updateLocal({...local,palette});}}/><span>Tone {i+1}</span></label>)}</div><button type="button" onClick={()=>updateLocal({...local,palette:[...MIGAKU_TONE_PALETTE]})}>Reset colors</button></fieldset>}
 </fieldset>{connection}
 <fieldset className="settings-account"><legend>Lexirise account settings</legend>
 <div className="settings-actions"><button type="button" disabled={busy} onClick={()=>void reload()}>Reload from Lexirise</button><button type="button" disabled={busy||!draft} onClick={()=>void save()}>Save to Lexirise</button><button type="button" disabled={busy||!original} onClick={()=>{setDraft(structuredClone(original));setMessage('Account changes discarded.');}}>Discard account changes</button></div>
 <p role="status">{busy?'Contacting Lexirise…':message}</p>
 {draft&&<><h3>Study languages</h3><div className="study-languages">{studyLanguages.map(code=><label key={code}><input type="checkbox" checked={draft.languages.includes(code)} onChange={e=>setDraft(d=>d?{...d,languages:e.target.checked?[...d.languages,code]:d.languages.filter(l=>l!==code)}:d)}/>{capabilities[code].name}</label>)}</div>
 <h3>Global preferences</h3>{globalFields.map(key=><Field key={key} name={key} value={draft.global[key]} onChange={v=>updateGlobal(key,v)}/>)}
 <h3>Per-language preferences</h3><select aria-label="Edit account language" value={editing} onChange={e=>setEditing(e.target.value as StudyLanguage)}>{studyLanguages.map(l=><option key={l} value={l}>{capabilities[l].name}</option>)}</select>
 {languageFields.filter(key=>key in languageView && (!['readingAid','readingAboveWords'].includes(key)||cap.readings.length) && (key!=='script'||cap.scripts.length) && (!['customToneColors','toneColorPreset'].includes(key)||cap.tones) && (key!=='automaticGrammarHighlighting'||cap.grammar) && (key!=='segmentByCharacter'||languageView[key]!==null)).map(key=><Field key={editing+key} name={key} value={languageView[key]} options={key==='readingAid'?cap.readings:key==='script'?cap.scripts:undefined} onChange={v=>updateLanguage(key,v)}/>)}
 {!draft.languageSettings[editing]&&<p>Select this language in Study languages and save to load its default preferences. No other language's settings will be changed.</p>}
 <small>Structured popup, dictionary and palette fields preserve all options. Derived fields and native language are never sent.</small></>}
 </fieldset></section></div>;
}
