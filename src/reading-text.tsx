
import {createReader, type StudyLanguage} from '@firebird55/lexirise-components';
import {clientFor} from './reading-client';
import {getPortalContainer} from './portal';
import type {ComponentProps} from 'react';
export {DEFAULT_READING_OPTIONS,MIGAKU_TONE_PALETTE,restoreReadingOptions,enabled,toneStyle} from '@firebird55/lexirise-components';
export type {ReadingOptions,ReadingScope,Reading,Token,Lookup} from '@firebird55/lexirise-components';
const readers=new Map<string,ReturnType<typeof createReader>>();
function readerFor(source:StudyLanguage,translation:string){const key=source+':'+translation;let reader=readers.get(key);
 if(!reader){const client=clientFor(source,translation);const ready=client.initializeClient();reader=createReader({sourceLanguage:source,translationLanguage:translation,
 portalContainer:getPortalContainer,request:async(...args)=>{await ready;return client.requestReading(...args);}});readers.set(key,reader);}return reader;}
type Props=ComponentProps<ReturnType<typeof createReader>['ReadingText']>&{sourceLanguage?:StudyLanguage;translationLanguage?:string};
export function ReadingText({sourceLanguage='zh',translationLanguage='en',...props}:Props){const Reader=readerFor(sourceLanguage,translationLanguage).ReadingText;return <Reader {...props}/>;}
export function resetReadingCaches(){for(const reader of readers.values())reader.resetReadingCaches();}
