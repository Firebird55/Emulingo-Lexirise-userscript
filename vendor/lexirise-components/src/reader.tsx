'use client';
import { capabilities, type StudyLanguage } from './capabilities.js';

import { memo, useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Bookmark, Play, Volume2, X } from 'lucide-react';
import { countUnknownWords, restoreTranslationLimit, type ReadingSummary, type TranslationLimit } from './translation-visibility.js';
import { appliesToWord, unknownWordGrammar, grammarUrl, type GrammarRule } from './grammar-rules.js';

export type ReadingScope = 'unknown' | 'all' | 'off';
export type ReadingOptions = {
  pinyin: ReadingScope;
  zhuyin: ReadingScope;
  toneMarks: ReadingScope;
  meanings: ReadingScope;
  toneColors: ReadingScope;
  hideEnglishAt: TranslationLimit;
  palette: [string, string, string, string, string, ...string[]];
};
export const DEFAULT_TONE_PALETTE: ReadingOptions['palette'] = ['#ff526b', '#ffd34d', '#43cfa1', '#4fa8ff', '#9ca9b7'];
/** @deprecated Use DEFAULT_TONE_PALETTE. Saved colors are unchanged. */
export const MIGAKU_TONE_PALETTE = DEFAULT_TONE_PALETTE;
export const DEFAULT_READING_OPTIONS: ReadingOptions = {
  pinyin: 'unknown', zhuyin: 'off', toneMarks: 'off', meanings: 'unknown',
  toneColors: 'all', hideEnglishAt: 'off', palette: [...DEFAULT_TONE_PALETTE],
};
export function isReadingScope(value: unknown): value is ReadingScope {
  return value === 'unknown' || value === 'all' || value === 'off';
}
export function restoreReadingOptions(value: unknown): ReadingOptions {
  if (!value || typeof value !== 'object') return { ...DEFAULT_READING_OPTIONS, palette: [...DEFAULT_TONE_PALETTE] };
  const saved = value as Record<string, unknown>;
  const palette = Array.isArray(saved.palette) && saved.palette.length >= 5 && saved.palette.length <= 6
    && saved.palette.every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
    ? saved.palette as ReadingOptions['palette'] : [...DEFAULT_TONE_PALETTE] as ReadingOptions['palette'];
  return {
    pinyin: isReadingScope(saved.pinyin) ? saved.pinyin : 'unknown',
    zhuyin: isReadingScope(saved.zhuyin) ? saved.zhuyin : 'off',
    toneMarks: isReadingScope(saved.toneMarks) ? saved.toneMarks : 'off',
    meanings: isReadingScope(saved.meanings) ? saved.meanings : 'unknown',
    toneColors: isReadingScope(saved.toneColors) ? saved.toneColors : 'all',
    hideEnglishAt: restoreTranslationLimit(saved.hideEnglishAt),
    palette,
  };
}
export type Token = { start: number; end: number; word: string; pinyin: string; zhuyin: string; tones: number[]; proficiency: number; meaning: string; entryId?: number | null };
export type Reading = { text: string; tokens: Token[]; pendingMeanings?: boolean; analysisPending?: boolean; grammar?: GrammarRule[] };
type Component = { character: string; type: string[]; hint: string; pinyin?: string[]; gloss?: string; characterHint?: string };
export type Lookup = {
  sourceLanguage?:string; translationLanguage?:string;
  translations: { meaning: string; partOfSpeech: string[]; examples: { text: string; translation: string }[] }[];
  examples: { text: string; translation: string }[];
  dictionaries: { name: string; headword: string; reading: string; definitions: string[] }[];
  hskLevel?: number; rank?: number; frequencyScore?: number;
  alternateReadings: string[];
  components: Component[];
  characterHint?: string; strokeCount?: number; character?: string;
};
type ContextMeaning = { meaning: string; conciseMeaning: string; reading: string };
type CharacterBreakdown = { partial?: boolean; characters: { character: string; hint: string; strokeCount?: number;
  unavailable?: boolean; pinyin: string[]; gloss: string;
  components: Component[] }[] };
type ExampleResult = { examples: { text: string; translation: string; tokens: Token[] }[] };
type SimilarResult = { generated: boolean; suggestions: { word: string; pinyin: string;
  tones: number[]; meaning: string; usage: string }[] };
type WordTab = 'definition' | 'grammar' | 'context' | 'examples' | 'similar' | 'components';

export function enabled(scope: ReadingScope, unknown: boolean) {
  return scope === 'all' || (scope === 'unknown' && unknown);
}
const TONE_MARKS: Record<number, string> = { 1: '¯', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' };
export function toneStyle(tones: number[], text: string, palette: ReadingOptions['palette']): React.CSSProperties | undefined {
  const first = tones.find(value => value >= 1 && value <= palette.length);
  if (!first) return undefined;
  if (tones.length !== text.length || tones.length === 1 || tones.some(value => value < 1 || value > palette.length))
    return { color: palette[first - 1] };
  const stops = tones.map((value, index) =>
    `${palette[value - 1]} ${index * 100 / tones.length}% ${(index + 1) * 100 / tones.length}%`);
  return { backgroundImage: `linear-gradient(90deg, ${stops.join(', ')})`,
    backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' };
}


export type ReaderAdapter = { sourceLanguage: StudyLanguage; translationLanguage:string;
 request:(text:string,action:string,params?:{start?:number,index?:number},init?:RequestInit)=>Promise<Response>;
 portalContainer?:()=>HTMLElement|undefined;
};
export function createReader(adapter:ReaderAdapter) {
 const requestReading = adapter.request;
 const getPortalContainer = adapter.portalContainer ?? (()=>undefined);
 const language = adapter.sourceLanguage;
 const capability = capabilities[language];
 function notify(name:string,detail?:unknown) { try { window.dispatchEvent(detail===undefined?new Event(name):new CustomEvent(name,{detail})); } catch {} }
const cache = new Map<number, { reading: Reading; at: number }>();
const lookupCache = new Map<string, Lookup>();
const proficiencyOverrides = new Map<number, number>();
const grammarOverrides = new Map<string, { proficiency: number; localOverride: boolean }>();
function resetReadingCaches() {
  cache.clear(); lookupCache.clear(); proficiencyOverrides.clear(); grammarOverrides.clear();
}
function applyOverrides(reading: Reading): Reading {
  return { ...reading, grammar: reading.grammar?.map(rule => ({ ...rule, ...grammarOverrides.get(rule.slug) })), tokens: reading.tokens.map(token => {
    const level = token.entryId == null ? undefined : proficiencyOverrides.get(token.entryId);
    return level == null ? token : { ...token, proficiency: level };
  }) };
}
function cachedReading(id: number, text: string): Reading | null {
  const saved = cache.get(id);
  return saved && saved.reading.text === text && Date.now() - saved.at < 10 * 60_000 ? applyOverrides(saved.reading) : null;
}
function shortGloss(meaning: string) {
  const first = meaning.split(/[,;]/, 1)[0].trim();
  return first.length > 32 ? `${first.slice(0, 29)}…` : first;
}
const WORD_LEVELS = [
  { value: 1, short: 'T', label: 'Tracked' },
  { value: 2, short: 'L', label: 'Learning' },
  { value: 3, short: 'F', label: 'Fresh' },
  { value: 4, short: 'K', label: 'Known' },
] as const;

function speakChinese(text: string) {
  if (!capability.tts || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'zh' ? 'zh-CN' : language;
  utterance.rate = 0.82;
  const voice = window.speechSynthesis.getVoices().find(value => value.lang.toLowerCase().startsWith(language));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function ExampleChinese({ text, tokens, options }: { text: string; tokens: Token[]; options: ReadingOptions }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [index, token] of tokens.entries()) {
    if (token.start < cursor || token.end > text.length) continue;
    if (token.start > cursor) parts.push(text.slice(cursor, token.start));
    const word = text.slice(token.start, token.end);
    const unknown = token.proficiency < 4;
    parts.push(<span key={`${token.start}-${index}`} className="reading-token">
      {enabled(options.pinyin, unknown) && token.pinyin && <span className="reading-pinyin">{token.pinyin}</span>}
      {enabled(options.zhuyin, unknown) && token.zhuyin && <span className="reading-zhuyin">{token.zhuyin}</span>}
      <span className="reading-hanzi" style={enabled(options.toneColors, unknown) ? toneStyle(token.tones || [], word, options.palette) : undefined}>{word}</span>
      {enabled(options.meanings, unknown) && token.meaning && <span className="reading-meaning">{shortGloss(token.meaning)}</span>}
    </span>);
    cursor = token.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <div className="word-example-chinese" lang={language} dir={capability.direction}>{parts}</div>;
}

function pronunciationTone(reading: string): number {
  const index = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ']
    .findIndex(marks => [...reading].some(letter => marks.includes(letter)));
  return index < 0 ? 5 : index + 1;
}

function DefinitionComponents({ character, hint, strokeCount, components, options }: {
  character: string; hint?: string; strokeCount?: number; components: Component[]; options: ReadingOptions;
}) {
  if (!hint && !components.length && strokeCount == null) return null;
  return <section className="word-definition-components" aria-label={`${character} character explanation`}>
    <h3>{character} <span>Character explanation</span>{strokeCount != null && <small>{strokeCount} strokes</small>}</h3>
    {hint && <p className="word-character-hint">{hint}</p>}
    {!!components.length && <>
      <h4>Components <small>{components.length}</small></h4>
      <div className="word-component-cards">{components.map((part, index) => <article key={index}>
        <div className="word-component-glyph"><small>{part.pinyin?.join(' · ')}</small>
          <strong lang={language} dir={capability.direction} style={enabled(options.toneColors, true) && part.pinyin?.length ?
            toneStyle([pronunciationTone(part.pinyin[0])], part.character, options.palette) : undefined}>{part.character}</strong>
        </div>
        <div><span className="word-component-type">{part.type.join(', ') || 'Component'}</span>
          {part.gloss && <p className="word-component-gloss">{part.gloss}</p>}
          {(part.hint || part.characterHint) && <p>{part.hint || part.characterHint}</p>}
          {part.hint && part.characterHint && part.hint !== part.characterHint &&
            <details><summary>Character explanation</summary><p>{part.characterHint}</p></details>}
        </div>
      </article>)}</div>
    </>}
  </section>;
}

function WordSheet({ id, text, token, lookup, lookupError, options, anchor, keyboard, grammar, analysisPending, onGrammarChange, onGrammarRetry, onClose, onProficiency, onRetry }: {
  id: number; text: string; token: Token; lookup?: Lookup; lookupError: boolean;
  anchor: HTMLElement; keyboard: boolean;
  options: ReadingOptions; onClose: () => void; onProficiency: (level: number) => void; onRetry: () => void;
  grammar: GrammarRule[]; analysisPending: boolean;
  onGrammarChange: (rule: { slug: string; proficiency: number; localOverride: boolean }) => void;
  onGrammarRetry: () => void;
}) {
  const [tab, setTab] = useState<WordTab>('definition');
  const [context, setContext] = useState<ContextMeaning | null>(null);
  const [contextError, setContextError] = useState(false);
  const [contextQuestion, setContextQuestion] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [characters, setCharacters] = useState<CharacterBreakdown | null>(null);
  const [charactersError, setCharactersError] = useState(false);
  const [examples, setExamples] = useState<ExampleResult | null>(null);
  const [examplesError, setExamplesError] = useState(false);
  const [savedExamples, setSavedExamples] = useState<Record<number, boolean>>({});
  const [savingExample, setSavingExample] = useState<number | null>(null);
  const [exampleSaveError, setExampleSaveError] = useState('');
  const [similar, setSimilar] = useState<SimilarResult | null>(null);
  const [similarError, setSimilarError] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [savingGrammar, setSavingGrammar] = useState<string | null>(null);
  const [grammarSaveError, setGrammarSaveError] = useState('');
  const unknownGrammar = unknownWordGrammar(grammar, token.start, token.end);
  const sortedGrammar = [...grammar].sort((left, right) =>
    Number(appliesToWord(right, token.start, token.end)) - Number(appliesToWord(left, token.start, token.end)));
  async function setGrammarKnown(rule: GrammarRule) {
    if (savingGrammar !== null) return;
    setSavingGrammar(rule.slug);
    setGrammarSaveError('');
    try {
      const response = await requestReading(text, 'grammar', {}, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
        body: JSON.stringify({ slug: rule.slug, known: rule.proficiency < 4 }),
      });
      if (!response.ok) throw new Error('Could not save grammar status. Try again.');
      onGrammarChange(await response.json());
    } catch (error) {
      setGrammarSaveError(error instanceof Error ? error.message : 'Could not save grammar status.');
    } finally {
      setSavingGrammar(null);
    }
  }
  useEffect(() => {
    if (tab !== 'context' || context || contextError) return;
    const controller = new AbortController();
    requestReading(text, 'context', {start: token.start},
      { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Context unavailable'); return response.json() as Promise<ContextMeaning>; })
      .then(setContext)
      .catch(() => { if (!controller.signal.aborted) setContextError(true); });
    return () => controller.abort();
  }, [tab, context, contextError, id, token.start]);
  useEffect(() => {
    if (!capability.characters || (tab !== 'components' && tab !== 'definition') || (token.word.length === 1 && !lookup) || characters || charactersError) return;
    const controller = new AbortController();
    requestReading(text, 'characters', {start: token.start},
      { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Components unavailable'); return response.json() as Promise<CharacterBreakdown>; })
      .then(setCharacters)
      .catch(() => { if (!controller.signal.aborted) setCharactersError(true); });
    return () => controller.abort();
  }, [tab, characters, charactersError, id, token.start, token.word, lookup]);
  useEffect(() => {
    if (tab !== 'examples' || examples || examplesError) return;
    const controller = new AbortController();
    requestReading(text, 'examples', {start: token.start},
      { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Examples unavailable'); return response.json() as Promise<ExampleResult>; })
      .then(setExamples)
      .catch(() => { if (!controller.signal.aborted) setExamplesError(true); });
    return () => controller.abort();
  }, [tab, examples, examplesError, id, token.start]);
  useEffect(() => {
    if (tab !== 'similar' || similar || similarError) return;
    const controller = new AbortController();
    requestReading(text, 'similar', {start: token.start},
      { cache: 'no-store', signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Similar words unavailable'); return response.json() as Promise<SimilarResult>; })
      .then(setSimilar)
      .catch(() => { if (!controller.signal.aborted) setSimilarError(true); });
    return () => controller.abort();
  }, [tab, similar, similarError, id, token.start]);
  async function setLevel(level: number) {
    if (saving !== null || level === token.proficiency) return;
    setSaving(level);
    setSaveError('');
    try {
      const response = await requestReading(text, 'proficiency', {}, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
        body: JSON.stringify({ start: token.start, proficiency: level }),
      });
      if (!response.ok) throw new Error('Lexirise could not save this word. Try again.');
      onProficiency(level);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this word.');
    } finally {
      setSaving(null);
    }
  }
  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = contextQuestion.trim();
    if (!question || questionBusy) return;
    setQuestionBusy(true);
    setQuestionError('');
    try {
      const response = await requestReading(text, 'context', {}, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
        body: JSON.stringify({ start: token.start, question }),
      });
      if (!response.ok) throw new Error('Lexirise could not answer that question. Try again.');
      const result = await response.json() as ContextMeaning;
      setQuestionAnswer(result.meaning || 'No answer was returned.');
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : 'Could not get an answer.');
    } finally {
      setQuestionBusy(false);
    }
  }
  async function saveExample(index: number) {
    if (savingExample !== null || savedExamples[index]) return;
    setSavingExample(index);
    setExampleSaveError('');
    try {
      const response = await requestReading(text, 'save-example', {start: token.start, index}, {
        method: 'POST', headers: { 'X-Reader-Action': 'lexirise' },
      });
      if (!response.ok) throw new Error('Lexirise could not save this example. Try again.');
      setSavedExamples(previous => ({ ...previous, [index]: true }));
    } catch (error) {
      setExampleSaveError(error instanceof Error ? error.message : 'Could not save this example.');
    } finally {
      setSavingExample(null);
    }
  }
  return <Popover.Root open modal={false} onOpenChange={(open,details) => {
    // The reader's composed-path click handler owns outside dismissal across
    // shadow roots. Closing on pointerdown would reopen a same-word click.
    if(details.reason==='outside-press'||details.reason==='focus-out'){
      details.allowPropagation();details.cancel();return;
    }
    if (!open) onClose();
  }}>
    <Popover.Portal container={getPortalContainer()}>
    <Popover.Positioner anchor={anchor} side="bottom" sideOffset={8} align="start" positionMethod="fixed"
      collisionPadding={12} collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }}
      className="word-sheet-positioner">
    <Popover.Popup className="word-sheet" initialFocus={keyboard} finalFocus={keyboard ? () => anchor : false}>
      <Popover.Close className="word-sheet-close" aria-label="Close word lookup"><X size={17} /></Popover.Close>
      <div className="word-sheet-top">
        <div className="word-sheet-identity">
          <div className="word-sheet-headword"><Popover.Title className="word-sheet-title"
            style={enabled(options.toneColors, token.proficiency < 4) ? toneStyle(token.tones || [], token.word, options.palette) : undefined}>{token.word}</Popover.Title>
            <button type="button" className="word-speak" onClick={() => speakChinese(token.word)} title="Speak using this device's source-language voice" aria-label={`Pronounce ${token.word}`}><Play size={17} fill="currentColor" /></button>
          </div>
          <div className="word-sheet-reading">{token.pinyin}{lookup?.alternateReadings?.length ? ` · ${lookup.alternateReadings.join(' · ')}` : ''}</div>
          {enabled(options.zhuyin, token.proficiency < 4) && token.zhuyin && <div className="word-sheet-zhuyin">{token.zhuyin}</div>}
        </div>
        <div className="word-levels" role="group" aria-label="Lexirise vocabulary status">
          {WORD_LEVELS.map(level => <button key={level.value} type="button"
            className={token.proficiency === level.value ? `active level-${level.value}` : ''}
            disabled={saving !== null} onClick={() => void setLevel(level.value)}
            title={level.label} aria-label={`Mark ${token.word} ${level.label}`}
            aria-pressed={token.proficiency === level.value}>{saving === level.value ? '…' : level.short}</button>)}
        </div>
      </div>
      {saveError && <p className="word-sheet-error" role="alert">{saveError}</p>}
      <div className="word-tabs" role="tablist" aria-label="Word details">
        {(['definition', 'grammar', 'context', 'examples', 'similar', 'components'] as const).filter(value => (value !== 'components' || capability.characters) && (value !== 'grammar' || capability.grammar)).map(value =>
          <button key={value} type="button" role="tab" aria-selected={tab === value}
            className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
      <div className="word-sheet-body" role="tabpanel">
        {tab === 'definition' && (unknownGrammar.length > 0 || analysisPending) &&
          <section className="word-grammar-summary" aria-label="Unknown grammar for this word">
            <small>Unknown grammar</small>
            {unknownGrammar.slice(0, 3).map(rule => <button type="button" key={rule.slug}
              title={`${rule.title}: ${rule.subtitle}`} onClick={() => setTab('grammar')}>
              <strong lang={language} dir={capability.direction}>{rule.title}</strong><span>{rule.subtitle}</span>
            </button>)}
            {unknownGrammar.length > 3 && <button type="button" className="word-grammar-more"
              onClick={() => setTab('grammar')}>+{unknownGrammar.length - 3} more</button>}
            {analysisPending && <small>Checking grammar…</small>}
          </section>}
        {tab === 'grammar' && <div className="word-grammar-details">
          <h3>Grammar in this sentence</h3>
          <p className="word-grammar-sentence" lang={language} dir={capability.direction}>{text}</p>
          {analysisPending && <p className="word-grammar-note">Detailed analysis is still running.
            <button type="button" onClick={onGrammarRetry}>Check again</button></p>}
          {!grammar.length && !analysisPending && <p>No grammar rules were returned for this sentence.
            <button type="button" className="word-retry" onClick={onGrammarRetry}>Retry grammar analysis</button></p>}
          {sortedGrammar.map(rule => <article key={rule.slug}
            className={`${rule.proficiency >= 4 ? 'is-known' : ''} ${appliesToWord(rule, token.start, token.end) ? 'uses-selected-word' : ''}`}>
            <div className="word-grammar-heading"><a href={grammarUrl(rule.slug, language)} target="_blank" rel="noopener noreferrer"
              aria-label={`Read about ${rule.title} on Lexirise`}><strong lang={language} dir={capability.direction}>{rule.title}</strong><span>↗</span></a>
              {rule.level && <small>{rule.level}</small>}</div>
            <p>{rule.subtitle}</p>
            <div className="word-grammar-examples" lang={language} dir={capability.direction}>{rule.examples.map((example, index) => <span key={index}>{example}</span>)}</div>
            <div className="word-grammar-actions"><small>{rule.proficiency >= 4 ? 'Known' :
              WORD_LEVELS.find(level => level.value === rule.proficiency)?.label || 'Unknown'}
              {rule.localOverride ? ' · Local' : ''}
              {appliesToWord(rule, token.start, token.end) ? ' · Uses this word' : ''}</small>
              <button type="button" disabled={savingGrammar !== null} onClick={() => void setGrammarKnown(rule)}>
                {savingGrammar === rule.slug ? 'Saving…' : rule.proficiency >= 4 ? 'Mark unknown' : 'Mark known'}</button></div>
          </article>)}
          {grammarSaveError && <p className="word-sheet-error" role="alert">{grammarSaveError}</p>}
          <small className="word-grammar-note">Status changes are saved on this browser. Lexirise's API currently provides read-only grammar states; use the rule links to read more or update them on Lexirise.</small>
        </div>}
        {!lookup && !lookupError && (tab === 'definition' || (tab === 'components' && token.word.length === 1)) &&
          <p>{token.meaning || 'Looking up word details…'}<small className="word-loading-note">Loading dictionary details…</small></p>}
        {lookupError && (tab === 'definition' || (tab === 'components' && token.word.length === 1)) &&
          <p>Dictionary details are unavailable. {token.meaning}
          <button type="button" className="word-retry" onClick={onRetry}>Retry dictionary lookup</button></p>}
        {tab === 'definition' && lookup && <>
          <div className="word-definition-senses">{lookup.translations.length ? lookup.translations.map((sense, index) =>
            <div className="word-definition-lead" key={index}><span>{sense.meaning}</span>
              {sense.partOfSpeech.map((part, partIndex) => <span className="word-pos" key={partIndex}>{part}</span>)}
            </div>) : <p>{token.meaning || 'No definition yet'}</p>}</div>
          {lookup.hskLevel != null && <span className="word-hsk">HSK {lookup.hskLevel}</span>}
          {token.word.length > 1 && <section className="word-character-summary">
            <h3>Characters</h3>
            {characters ? <div className="word-character-summary-list">{characters.characters.map((character, index) =>
              <div key={index} className="word-character-summary-item">
                <span><small>{character.pinyin?.join(' · ')}</small><strong>{character.character}</strong></span>
                <p>{character.gloss || (character.unavailable ? 'Details unavailable' : '')}</p>
              </div>)}</div> : <p>{charactersError ? <button type="button" className="word-retry" onClick={() => setCharactersError(false)}>Retry character details</button> : 'Loading character details…'}</p>}
          </section>}
          {lookup.dictionaries.map((dictionary, index) => <section className="word-dictionary" key={index}>
            <h3>{dictionary.name}</h3>
            <p><strong>{dictionary.headword}</strong> <span>{dictionary.reading}</span></p>
            <ul>{dictionary.definitions.map((meaning, item) => <li key={item}>{meaning}</li>)}</ul>
          </section>)}
          {token.word.length === 1 ? <DefinitionComponents character={lookup.character || token.word} options={options}
            hint={lookup.characterHint} strokeCount={lookup.strokeCount}
            components={characters?.characters[0]?.components || lookup.components} /> :
            characters?.characters.map((character, index) => <DefinitionComponents key={index} options={options}
              character={character.character} hint={character.hint} strokeCount={character.strokeCount} components={character.components} />)}
          {charactersError && <button type="button" className="word-retry"
            onClick={() => setCharactersError(false)}>Retry component details</button>}
          {characters?.partial && <button type="button" className="word-retry"
            onClick={() => setCharacters(null)}>Retry missing character explanations</button>}
          {lookup.rank != null && <div className="word-frequency"><span>Frequency</span>
            {lookup.frequencyScore != null && <span className="word-frequency-bars" aria-label={`Frequency score ${Math.round(lookup.frequencyScore * 100)} percent`}>
              {Array.from({ length: 4 }, (_, index) => <i key={index} className={lookup.frequencyScore! >= (index + 1) / 4 ? 'on' : ''} />)}
            </span>}
            <span>{lookup.rank <= 100 ? 'Very common' : lookup.rank <= 5000 ? 'Common' : 'Less common'}</span>
            <span>#{lookup.rank.toLocaleString()}</span></div>}
        </>}
        {tab === 'context' && <div className="word-context">
          <p lang={language} dir={capability.direction}>{text}</p>
          {context ? <><strong>{context.conciseMeaning || token.meaning}</strong><p>{context.meaning}</p>
            {context.reading && <small>In this line: {context.reading}</small>}</> :
            <p>{contextError ? <>Context explanation unavailable.
              <button type="button" className="word-retry" onClick={() => setContextError(false)}>Retry context</button></> :
              'Explaining this word in the line…'}</p>}
          {questionAnswer && <div className="word-context-answer">{questionAnswer}</div>}
          <form className="word-context-question" onSubmit={event => void askQuestion(event)}>
            <input value={contextQuestion} maxLength={500} onChange={event => setContextQuestion(event.target.value)}
              placeholder="Ask about nuance, grammar, or tone" aria-label="Ask Lexirise about this word" />
            <button type="submit" disabled={!contextQuestion.trim() || questionBusy} aria-label="Ask Lexirise">{questionBusy ? '…' : '↑'}</button>
          </form>
          {questionError && <p className="word-sheet-error" role="alert">{questionError}</p>}
        </div>}
        {tab === 'examples' && <div className="word-examples">
          {examples ? examples.examples.length ? examples.examples.map((example, index) => <article key={index} className="word-example">
            <div className="word-example-main"><ExampleChinese text={example.text} tokens={example.tokens} options={options} />
              <p>{example.translation}</p></div>
            <div className="word-example-actions">
              <button type="button" onClick={() => speakChinese(example.text)} title="Play with this device's Chinese voice" aria-label={`Play example ${index + 1}`}><Volume2 size={18} /></button>
              <button type="button" onClick={() => void saveExample(index)} disabled={savingExample !== null || savedExamples[index]}
                className={savedExamples[index] ? 'saved' : ''} title="Save example sentence to Lexirise (text only)"
                aria-label={savedExamples[index] ? `Example ${index + 1} saved` : `Save example ${index + 1} to Lexirise`}><Bookmark size={18} /></button>
            </div>
          </article>) : <p>Lexirise has no example sentences for this word.</p> :
            <p>{examplesError ? <>Examples unavailable.
              <button type="button" className="word-retry" onClick={() => setExamplesError(false)}>Retry examples</button></> : 'Loading examples…'}</p>}
          {exampleSaveError && <p className="word-sheet-error" role="alert">{exampleSaveError}</p>}
          <small>Example playback uses this device’s Chinese speech voice. Bookmarks save text and translation to Lexirise.</small>
        </div>}
        {tab === 'similar' && <div className="word-similar">
          <h3>Close in meaning</h3>
          {similar ? similar.suggestions.length ? similar.suggestions.map((suggestion, index) => <article key={index}>
            <span className="word-similar-reading">{suggestion.pinyin}</span>
            <strong style={enabled(options.toneColors, true) ? toneStyle(suggestion.tones || [], suggestion.word, options.palette) : undefined}>{suggestion.word}</strong>
            <p>{suggestion.meaning}</p><small>{suggestion.usage}</small>
          </article>) : <p>Lexirise did not return verified similar words for this use.</p> :
            <p>{similarError ? <>Similar words unavailable.
              <button type="button" className="word-retry" onClick={() => setSimilarError(false)}>Retry similar words</button></> : 'Finding similar words…'}</p>}
          <small>Usage notes are AI suggestions; each displayed word was checked against Lexirise’s dictionary.</small>
        </div>}
        {tab === 'components' && <div className="word-components">
          {token.word.length > 1 ? characters ? characters.characters.map((character, charIndex) => <section className="word-character" key={charIndex}>
            <h3>{character.character} {character.strokeCount != null && <small>{character.strokeCount} strokes</small>}</h3>
            {character.hint && <p>{character.hint}</p>}
            {character.unavailable && <p>Character details unavailable right now.</p>}
            {character.components.map((part, index) => <div key={index} className="word-component">
              <strong>{part.character}</strong><span>{part.type.join(', ') || 'Component'}{part.hint && <small>{part.hint}</small>}</span>
            </div>)}
          </section>) : <p>{charactersError ? <>Character details are unavailable.
            <button type="button" className="word-retry" onClick={() => setCharactersError(false)}>Retry components</button></> :
            'Loading character components…'}</p> : lookup && <>
            {lookup.characterHint && <p>{lookup.characterHint}</p>}
            {lookup.strokeCount != null && <small>{lookup.strokeCount} strokes</small>}
            {lookup.components.length ? lookup.components.map((part, index) => <div key={index} className="word-component">
              <strong>{part.character}</strong><span>{part.type.join(', ') || 'Component'}{part.hint && <small>{part.hint}</small>}</span>
            </div>) : <p>Lexirise has no character components for this word.</p>}
          </>}
          {token.word.length > 1 && characters?.partial && <button type="button" className="word-retry"
            onClick={() => setCharacters(null)}>Retry missing characters</button>}
        </div>}
      </div>
    </Popover.Popup>
    </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

const ReadingText = memo(function ReadingText({ id, text, options, current = false, onSummary }: {
  id: number; text: string; options: ReadingOptions; current?: boolean;
  onSummary?: (summary: ReadingSummary) => void;
}) {
  const [reading, setReading] = useState<Reading | null>(cachedReading(id, text));
  const [open, setOpen] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [lookup, setLookup] = useState<{ index: number; value?: Lookup; error?: boolean } | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [error, setError] = useState(false);
  const refreshReading = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const dismiss = (event: Event) => {
      const path = event.composedPath();
      if (path.some(node => node instanceof Element && (node.classList.contains('word-sheet') || node.classList.contains('reading-hanzi')))) return;
      setOpen(null);
    };
    const otherWord = (event: Event) => { if ((event as CustomEvent).detail !== id) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if(event.key === 'Escape') setOpen(null); };
    window.addEventListener('click', dismiss, true);
    window.addEventListener('lexirise-open-word', otherWord);
    window.addEventListener('keydown', escape, true);
    return () => { window.removeEventListener('click', dismiss, true); window.removeEventListener('lexirise-open-word', otherWord); window.removeEventListener('keydown', escape, true); };
  }, [id]);
  useEffect(() => {
    onSummary?.({ id, text, unknownWords: reading?.text === text && !reading.analysisPending ? countUnknownWords(text, reading.tokens) : null });
  }, [id, text, reading, onSummary]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let refreshCount = 0;
    const refreshDelays = [800, 1200, 1800, 2600, 3800, 5600, 8000, 12000, 16000, 20000];
    setOpen(null);
    const saved = cachedReading(id, text);
    setReading(saved);
    async function refresh() {
      try {
        const response = await requestReading(text, 'analysis', {}, { cache: 'no-store' });
        if (!response.ok) throw new Error('Analysis unavailable');
        const result = applyOverrides(await response.json() as Reading);
        if (!active) return;
        cache.set(id, { reading: result, at: Date.now() });
        if(cache.size>250)cache.delete(cache.keys().next().value!);
        setReading(result);
        setError(false);
        if ((result.pendingMeanings || result.analysisPending) && refreshCount < refreshDelays.length) {
          timer = setTimeout(refresh, refreshDelays[refreshCount++]);
        }
      } catch {
        if (active) setError(true);
      }
    }
    refreshReading.current = refresh;
    if (!saved || saved.pendingMeanings || saved.analysisPending) void refresh();
    const onChange = () => setReading(previous => previous ? applyOverrides(previous) : previous);
    window.addEventListener('lexirise-word-state', onChange);
    window.addEventListener('lexirise-grammar-state', onChange);
    return () => { active = false; if (timer) clearTimeout(timer); refreshReading.current = null;
      window.removeEventListener('lexirise-word-state', onChange); window.removeEventListener('lexirise-grammar-state', onChange); };
  }, [id, text]);
  useEffect(() => {
    if (open === null || !reading || reading.text !== text) return;
    const token = reading.tokens[open];
    if (!token) return;
    const key = `${text}:${token.start}:${token.word}`;
    const saved = lookupCache.get(key);
    if (saved) { setLookup({ index: open, value: saved }); return; }
    let active = true;
    setLookup({ index: open });
    requestReading(text, 'lookup', {start: token.start}, { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Lookup unavailable'); return response.json() as Promise<Lookup>; })
      .then(value => { lookupCache.set(key, value); if(lookupCache.size>500)lookupCache.delete(lookupCache.keys().next().value!); if (active) setLookup({ index: open, value }); })
      .catch(() => { if (active) setLookup({ index: open, error: true }); });
    return () => { active = false; };
  }, [id, open, reading, text, lookupAttempt]);

  function onProficiency(level: number) {
    if (!reading || open === null) return;
    const entryId = reading.tokens[open]?.entryId;
    if (entryId == null) return;
    proficiencyOverrides.set(entryId, level);
    for (const [lineId, saved] of cache) cache.set(lineId, { ...saved, reading: applyOverrides(saved.reading) });
    notify('lexirise-word-state');
  }

  function onGrammarChange(rule: { slug: string; proficiency: number; localOverride: boolean }) {
    grammarOverrides.set(rule.slug, { proficiency: rule.proficiency, localOverride: rule.localOverride });
    for (const [lineId, saved] of cache) cache.set(lineId, { ...saved, reading: applyOverrides(saved.reading) });
    notify('lexirise-grammar-state');
  }

  if (!reading || reading.text !== text) return <p className={current ? 'current-chinese' : undefined} lang={language} dir={capability.direction} title={error ? 'Lexirise analysis unavailable' : 'Analyzing with Lexirise'}>{text}{error && <button className="reading-retry" type="button" onClick={() => void refreshReading.current?.()}>Retry Lexirise</button>}</p>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [index, token] of reading.tokens.entries()) {
    if (token.start < cursor || token.end > text.length) continue;
    if (token.start > cursor) parts.push(text.slice(cursor, token.start));
    const unknown = token.proficiency < 4;
    const wordText = text.slice(token.start, token.end);
    const colorStyle = enabled(options.toneColors, unknown)
      ? toneStyle(token.tones || [], wordText, options.palette) : undefined;
    const toneMarks = token.tones?.map(value => TONE_MARKS[value] || '').filter(Boolean).join(' ');
    parts.push(<span key={`${token.start}-${index}`} className="reading-token">
      {enabled(options.toneMarks, unknown) && !!toneMarks && <span className="reading-tone-marks" aria-hidden="true">{toneMarks}</span>}
      {enabled(options.pinyin, unknown) && !!token.pinyin && <span className="reading-pinyin" aria-hidden="true">{token.pinyin}</span>}
      {enabled(options.zhuyin, unknown) && !!token.zhuyin && <span className="reading-zhuyin" aria-hidden="true">{token.zhuyin}</span>}
      <span className="reading-hanzi" role="button" tabIndex={0}
        aria-haspopup="dialog" aria-expanded={open === index}
        onClick={event => { event.stopPropagation(); notify('lexirise-open-word', id); setAnchor(event.currentTarget); setKeyboard(false); setOpen(open === index ? null : index); }}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); notify('lexirise-open-word', id); setAnchor(event.currentTarget); setKeyboard(true); setOpen(open === index ? null : index); } }}
        style={colorStyle} title={token.meaning || 'Tap for word details'}>{wordText}</span>
      {enabled(options.meanings, unknown) && !!token.meaning && <span className="reading-meaning">{shortGloss(token.meaning)}</span>}
    </span>);
    cursor = token.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  const selected = open === null ? null : reading.tokens[open];
  return <><p className={`reading-text ${current ? 'current-chinese' : ''}`} lang={language} dir={capability.direction}>{parts}</p>
    {selected && anchor && <WordSheet key={`${id}:${selected.start}`} id={id} text={text} token={selected} options={options} anchor={anchor} keyboard={keyboard}
      grammar={reading.grammar || []} analysisPending={!!reading.analysisPending} onGrammarChange={onGrammarChange}
      onGrammarRetry={() => void refreshReading.current?.()}
      lookup={lookup?.index === open ? lookup.value : undefined} lookupError={lookup?.index === open && !!lookup.error}
      onClose={() => setOpen(null)} onProficiency={onProficiency}
      onRetry={() => { setLookup(null); setLookupAttempt(value => value + 1); }} />}</>;
});


 return { ReadingText, LookupWindow:WordSheet, resetReadingCaches };
}

const boundReaders = new WeakMap<ReaderAdapter, ReturnType<typeof createReader>>();
function bound(adapter:ReaderAdapter) {
 let result=boundReaders.get(adapter);if(!result){result=createReader(adapter);boundReaders.set(adapter,result);}return result;
}
export function Reader({adapter,...props}:{adapter:ReaderAdapter}&React.ComponentProps<ReturnType<typeof createReader>['ReadingText']>) {
 const Component=bound(adapter).ReadingText;return <Component {...props}/>;
}
export function LookupWindow({adapter,...props}:{adapter:ReaderAdapter}&React.ComponentProps<ReturnType<typeof createReader>['LookupWindow']>) {
 const Component=bound(adapter).LookupWindow;return <Component {...props}/>;
}
