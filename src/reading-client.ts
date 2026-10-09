
import { createLexiriseClient, type StudyLanguage } from '@firebird55/lexirise-components';
import { getValue, setValue, deleteValue, managerRequest } from './manager';
const clients=new Map<string,ReturnType<typeof createLexiriseClient>>();
export function clientFor(sourceLanguage:StudyLanguage='zh',translationLanguage='en'){
 const identity=sourceLanguage+':'+translationLanguage;
 let client=clients.get(identity);
 if(!client){client=createLexiriseClient({sourceLanguage,translationLanguage,cacheScope:'emulingo',getValue,setValue,deleteValue,
 request:async(path,method,payload)=>managerRequest('https://api.lexirise.app'+path,method,await getValue('lexirise:key',''),payload)});
 clients.set(identity,client);}
 return client;
}
const legacy=clientFor();
export const {hasKey,testConnection,requestReading,analyze,normalizeReading,normalizeGrammar,normalizeLookup}=legacy;
export async function initializeClient(){await legacy.initializeClient();}
export async function configureKey(key:string){await legacy.configureKey(key);for(const client of clients.values())if(client!==legacy)await client.initializeClient();}
export const settingsAdapter={load:legacy.loadSettings,patch:legacy.patchSettings};
