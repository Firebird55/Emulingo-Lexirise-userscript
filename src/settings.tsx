
import {useState} from 'react';
import {SettingsPanel as SharedSettingsPanel,restoreLocalSettings,type LocalSettings,type StudyLanguage} from '@firebird55/lexirise-components';
import {configureKey,hasKey,testConnection,settingsAdapter} from './reading-client';
import {getValue,setValue} from './manager';
export type Settings=LocalSettings & {fontSize:number};
export const restoreSettings=(value:unknown)=>restoreLocalSettings(value) as Settings;
export const DEFAULT_SETTINGS=restoreSettings(null);
export async function loadSettings(){return restoreSettings(await getValue('lexirise:settings',DEFAULT_SETTINGS));}
function Connection(){
 const [apiKey,setApiKey]=useState(''),[configured,setConfigured]=useState(hasKey()),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function connect(){setBusy(true);setMessage('');try{if(apiKey.trim()){await configureKey(apiKey);setApiKey('');setConfigured(true);}const result=await testConnection();setMessage(result.message);try{window.dispatchEvent(new Event('lexirise-credentials-changed'));}catch{}}catch(e){setMessage(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}}
 return <fieldset className="settings-key"><legend>Lexirise connection</legend><p>{configured?'API key saved in the userscript manager.':'Add your Lexirise Pro API key.'}</p>
 <input type="password" autoComplete="off" spellCheck={false} value={apiKey} aria-label="Lexirise API key" placeholder="Lexirise API key" onChange={e=>setApiKey(e.target.value)}/>
 <div className="settings-key-actions"><button type="button" disabled={busy||(!configured&&!apiKey.trim())} onClick={()=>void connect()}>{busy?'Connecting…':apiKey.trim()?'Save key and connect':'Test connection'}</button>
 <label className="settings-import">Import .txt key<input type="file" accept=".txt,text/plain" aria-label="Import API key file" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>4096){setMessage('Choose a small key file.');return;}setApiKey((await file.text()).trim());e.target.value='';}}/></label>
 {configured&&<button type="button" disabled={busy} onClick={async()=>{await configureKey('');setConfigured(false);setApiKey('');setMessage('API key removed.');}}>Remove key</button>}</div><p role="status">{message}</p><small>Emulingo Lexirise by <a href="https://github.com/Firebird55/Emulingo-Lexirise-userscript" target="_blank" rel="noopener noreferrer">Firebird55</a> · Independent community project.</small></fieldset>;
}
export function SettingsPanel({initial,onChange,onClose,sourceLanguage='zh'}:{initial:Settings,onChange:(next:Settings)=>void,onClose:()=>void,sourceLanguage?:StudyLanguage}){
 return <SharedSettingsPanel initial={initial} adapter={settingsAdapter} sourceLanguage={sourceLanguage} sourceOverride onClose={onClose} connection={<Connection/>}
 onChange={async next=>{const saved=restoreSettings(next);await setValue('lexirise:settings',saved);onChange(saved);}}/>;
}
