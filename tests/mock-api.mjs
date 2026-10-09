import manifest from '../vendor/lexirise-components/capabilities.json' with {type:'json'};
export const sample='对了，隔壁的大木博士正在找你呢。';
const lexicon={对了:['duì le',[4,5],'by the way'],隔壁:['gé bì',[2,4],'next door'],的:['de',[5],'of'],大木:['dà mù',[4,4],'Oak'],博士:['bó shì',[2,4],'professor'],正在:['zhèng zài',[4,4],'currently'],找:['zhǎo',[3],'look for'],你:['nǐ',[3],'you'],呢:['ne',[5],'particle'],朋友:['péng you',[2,5],'friend'],你好:['nǐ hǎo',[3,3],'hello'],总是:['zǒng shì',[3,4],'always'],要:['yào',[4],'want'],需要:['xū yào',[1,4],'need'],寻找:['xún zhǎo',[2,3],'search for'],寻求:['xún qiú',[2,2],'seek'],发现:['fā xiàn',[1,4],'discover']};
const entries=Object.keys(lexicon);const states=new Map();const saved=new Map();
const account={languages:['zh'],native_lang:'en',global:{translationLanguage:'en',interfaceLanguage:null,effectiveTranslationLanguage:'en',disableWordPopups:false,wordPopupOpenMode:'click',useCustomProficiencyColors:false,customProficiencyColors:{unknown:'amber',tracked:'slate',learning:'orange',fresh:'sky',known:'green'}},
 languageSettings:Object.fromEntries(Object.entries(manifest.languages).map(([lang,cap])=>[lang,{readingAid:cap.readings[1]??null,readingAboveWords:cap.readings.length?true:null,script:cap.scripts[0]??null,inlineGlossMode:'off',coloringMode:'learning_state',toneColorPreset:cap.tones?'lexirise':null,customToneColors:null,toneColors:null,colorKnownWordsToo:false,emphasizeFrequencyLevel:0,wordSpacing:'md',ttsOnWordClick:cap.tts,automaticGrammarHighlighting:cap.grammar?false:null,highlightProperNouns:true,customFont:'',fontSize:'md',segmentByCharacter:cap.characters?false:null,dictionariesEnabled:true,dictionaries:[],wordPopup:{tabs:[{id:'definition',enabled:true},{id:'context',enabled:true}],openOn:'first'},effectiveTranslationLanguage:'en'}]))};
export function mockApi(method,path,body={}){
 if(path==='/v1/settings'){if(method==='PATCH'){if(body.languages)account.languages=body.languages;if(body.global)Object.assign(account.global,body.global);for(const[lang,changes]of Object.entries(body.languageSettings??{}))Object.assign(account.languageSettings[lang],changes);}return structuredClone(account);}

  if(path==='/v1/me')return {user:{id:1},apiKey:{}};
  if(path==='/v1/analyze/text'){
    const text=body.text||'';const occurrences=[],entryMetaById={},stateByEntryId={};
    let i=0;
    while(i<text.length){const word=entries.sort((a,b)=>b.length-a.length).find(w=>text.startsWith(w,i))||text[i];
      const isWordLike=/\p{Script=Han}/u.test(word),entryId=entries.indexOf(word)+1||10000+word.codePointAt(0);
      const [transliteration,tones,gloss]=lexicon[word]||['nǐ',[3],'character'];
      occurrences.push({word,charStart:i,charEnd:i+word.length,isWordLike,entryId,transliteration,tones});
      entryMetaById[entryId]={gloss,transliteration,tones};stateByEntryId[entryId]={proficiency:states.get(word)??(word==='的'?4:0),saved_expression_id:saved.get(word)};i+=word.length;
    }
    const selected=occurrences.findIndex(o=>o.word==='正在');
    return {occurrences,entryMetaById,stateByEntryId,morphoPending:false,grammar:selected>=0?[{slug:'zhengzai',title:'正在',subtitle:'An action in progress',level:'HSK 2',indices:[selected],anchors:[]}]:[],grammarStates:{}};
  }
  if(path==='/v1/dictionary/lookup'){
    const [transliteration,tones,meaning]=lexicon[body.text]||['nǐ',[3],'character'];
    return {entry_id:entries.indexOf(body.text)+1||10000+body.text.codePointAt(0),word:body.text,transliteration,tones,translation_status:'ready',translations:[{target_lang:'en',translation:meaning,part_of_speech:['verb','noun'],examples:[{text:'你好，朋友。',translation:'Hello, friend.'}]},{target_lang:'en',translation:'An additional dictionary sense',part_of_speech:['expression'],examples:[]}],rank:1872,frequency_score:.76,system_tags:['HSK-3'],supplementalEntries:[{dictionary_name:'CC-CEDICT',headword:body.text,reading:transliteration,html:'<div data-sc-cccedict="headword">'+body.text+'</div><ul><li>first supplemental definition</li><li>second supplemental definition</li></ul>'}],characterInfo:[...body.text].length===1?{char:body.text,pinyin:[transliteration],gloss:meaning,hint:'A character explanation returned by the dictionary.',strokeCount:7,components:body.text==='找'?[{character:'扌',type:['semantic'],hint:'The hand component indicates an action.'},{character:'戈',type:['phonetic'],hint:'A historical sound component.'}]:[],statistics:{hskLevel:3}}:undefined};
  }
  if(path==='/v1/analyze/context')return body.question?.startsWith('Suggest exactly')?{meaning:'寻找 | search for | More deliberate than 找\n寻求 | seek | Often used for help or solutions\n发现 | discover | Emphasizes the result'}:{meaning:body.question?'This usage emphasizes that the action is happening now.':'In this sentence the word describes looking for someone.',conciseMeaning:'look for',reading:'zhǎo'};
  if(method==='POST'&&path==='/v1/vocabulary'){
    const id=saved.get(body.text)||1000+saved.size;saved.set(body.text,id);if(body.proficiency)states.set(body.text,body.proficiency);return {result:'created',item:{id,text:body.text,proficiency:body.proficiency}};
  }
  if(method==='PATCH'&&path.startsWith('/v1/vocabulary/')){
    const id=Number(path.split('/').pop()),word=[...saved].find(([,value])=>value===id)?.[0];if(word)states.set(word,body.proficiency);return {id,proficiency:body.proficiency};
  }
  throw new Error('Unsupported mock route '+method+' '+path);
}
