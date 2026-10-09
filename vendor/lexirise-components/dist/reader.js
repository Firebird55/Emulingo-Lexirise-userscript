'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { capabilities } from './capabilities.js';
import { memo, useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Bookmark, Play, Volume2, X } from 'lucide-react';
import { countUnknownWords, restoreTranslationLimit } from './translation-visibility.js';
import { appliesToWord, unknownWordGrammar, grammarUrl } from './grammar-rules.js';
export const MIGAKU_TONE_PALETTE = ['#ff526b', '#ffd34d', '#43cfa1', '#4fa8ff', '#9ca9b7'];
export const DEFAULT_READING_OPTIONS = {
    pinyin: 'unknown', zhuyin: 'off', toneMarks: 'off', meanings: 'unknown',
    toneColors: 'all', hideEnglishAt: 'off', palette: [...MIGAKU_TONE_PALETTE],
};
export function isReadingScope(value) {
    return value === 'unknown' || value === 'all' || value === 'off';
}
export function restoreReadingOptions(value) {
    if (!value || typeof value !== 'object')
        return { ...DEFAULT_READING_OPTIONS, palette: [...MIGAKU_TONE_PALETTE] };
    const saved = value;
    const palette = Array.isArray(saved.palette) && saved.palette.length >= 5 && saved.palette.length <= 6
        && saved.palette.every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
        ? saved.palette : [...MIGAKU_TONE_PALETTE];
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
export function enabled(scope, unknown) {
    return scope === 'all' || (scope === 'unknown' && unknown);
}
const TONE_MARKS = { 1: '¯', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' };
export function toneStyle(tones, text, palette) {
    const first = tones.find(value => value >= 1 && value <= palette.length);
    if (!first)
        return undefined;
    if (tones.length !== text.length || tones.length === 1 || tones.some(value => value < 1 || value > palette.length))
        return { color: palette[first - 1] };
    const stops = tones.map((value, index) => `${palette[value - 1]} ${index * 100 / tones.length}% ${(index + 1) * 100 / tones.length}%`);
    return { backgroundImage: `linear-gradient(90deg, ${stops.join(', ')})`,
        backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' };
}
export function createReader(adapter) {
    const requestReading = adapter.request;
    const getPortalContainer = adapter.portalContainer ?? (() => undefined);
    const language = adapter.sourceLanguage;
    const capability = capabilities[language];
    function notify(name, detail) { try {
        window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));
    }
    catch { } }
    const cache = new Map();
    const lookupCache = new Map();
    const proficiencyOverrides = new Map();
    const grammarOverrides = new Map();
    function resetReadingCaches() {
        cache.clear();
        lookupCache.clear();
        proficiencyOverrides.clear();
        grammarOverrides.clear();
    }
    function applyOverrides(reading) {
        return { ...reading, grammar: reading.grammar?.map(rule => ({ ...rule, ...grammarOverrides.get(rule.slug) })), tokens: reading.tokens.map(token => {
                const level = token.entryId == null ? undefined : proficiencyOverrides.get(token.entryId);
                return level == null ? token : { ...token, proficiency: level };
            }) };
    }
    function cachedReading(id, text) {
        const saved = cache.get(id);
        return saved && saved.reading.text === text && Date.now() - saved.at < 10 * 60_000 ? applyOverrides(saved.reading) : null;
    }
    function shortGloss(meaning) {
        const first = meaning.split(/[,;]/, 1)[0].trim();
        return first.length > 32 ? `${first.slice(0, 29)}…` : first;
    }
    const WORD_LEVELS = [
        { value: 1, short: 'T', label: 'Tracked' },
        { value: 2, short: 'L', label: 'Learning' },
        { value: 3, short: 'F', label: 'Fresh' },
        { value: 4, short: 'K', label: 'Known' },
    ];
    function speakChinese(text) {
        if (!capability.tts || !('speechSynthesis' in window))
            return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'zh' ? 'zh-CN' : language;
        utterance.rate = 0.82;
        const voice = window.speechSynthesis.getVoices().find(value => value.lang.toLowerCase().startsWith(language));
        if (voice)
            utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    }
    function ExampleChinese({ text, tokens, options }) {
        const parts = [];
        let cursor = 0;
        for (const [index, token] of tokens.entries()) {
            if (token.start < cursor || token.end > text.length)
                continue;
            if (token.start > cursor)
                parts.push(text.slice(cursor, token.start));
            const word = text.slice(token.start, token.end);
            const unknown = token.proficiency < 4;
            parts.push(_jsxs("span", { className: "reading-token", children: [enabled(options.pinyin, unknown) && token.pinyin && _jsx("span", { className: "reading-pinyin", children: token.pinyin }), enabled(options.zhuyin, unknown) && token.zhuyin && _jsx("span", { className: "reading-zhuyin", children: token.zhuyin }), _jsx("span", { className: "reading-hanzi", style: enabled(options.toneColors, unknown) ? toneStyle(token.tones || [], word, options.palette) : undefined, children: word }), enabled(options.meanings, unknown) && token.meaning && _jsx("span", { className: "reading-meaning", children: shortGloss(token.meaning) })] }, `${token.start}-${index}`));
            cursor = token.end;
        }
        if (cursor < text.length)
            parts.push(text.slice(cursor));
        return _jsx("div", { className: "word-example-chinese", lang: language, dir: capability.direction, children: parts });
    }
    function pronunciationTone(reading) {
        const index = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ']
            .findIndex(marks => [...reading].some(letter => marks.includes(letter)));
        return index < 0 ? 5 : index + 1;
    }
    function DefinitionComponents({ character, hint, strokeCount, components, options }) {
        if (!hint && !components.length && strokeCount == null)
            return null;
        return _jsxs("section", { className: "word-definition-components", "aria-label": `${character} character explanation`, children: [_jsxs("h3", { children: [character, " ", _jsx("span", { children: "Character explanation" }), strokeCount != null && _jsxs("small", { children: [strokeCount, " strokes"] })] }), hint && _jsx("p", { className: "word-character-hint", children: hint }), !!components.length && _jsxs(_Fragment, { children: [_jsxs("h4", { children: ["Components ", _jsx("small", { children: components.length })] }), _jsx("div", { className: "word-component-cards", children: components.map((part, index) => _jsxs("article", { children: [_jsxs("div", { className: "word-component-glyph", children: [_jsx("small", { children: part.pinyin?.join(' · ') }), _jsx("strong", { lang: language, dir: capability.direction, style: enabled(options.toneColors, true) && part.pinyin?.length ?
                                                    toneStyle([pronunciationTone(part.pinyin[0])], part.character, options.palette) : undefined, children: part.character })] }), _jsxs("div", { children: [_jsx("span", { className: "word-component-type", children: part.type.join(', ') || 'Component' }), part.gloss && _jsx("p", { className: "word-component-gloss", children: part.gloss }), (part.hint || part.characterHint) && _jsx("p", { children: part.hint || part.characterHint }), part.hint && part.characterHint && part.hint !== part.characterHint &&
                                                _jsxs("details", { children: [_jsx("summary", { children: "Character explanation" }), _jsx("p", { children: part.characterHint })] })] })] }, index)) })] })] });
    }
    function WordSheet({ id, text, token, lookup, lookupError, options, anchor, keyboard, grammar, analysisPending, onGrammarChange, onGrammarRetry, onClose, onProficiency, onRetry }) {
        const [tab, setTab] = useState('definition');
        const [context, setContext] = useState(null);
        const [contextError, setContextError] = useState(false);
        const [contextQuestion, setContextQuestion] = useState('');
        const [questionAnswer, setQuestionAnswer] = useState('');
        const [questionBusy, setQuestionBusy] = useState(false);
        const [questionError, setQuestionError] = useState('');
        const [characters, setCharacters] = useState(null);
        const [charactersError, setCharactersError] = useState(false);
        const [examples, setExamples] = useState(null);
        const [examplesError, setExamplesError] = useState(false);
        const [savedExamples, setSavedExamples] = useState({});
        const [savingExample, setSavingExample] = useState(null);
        const [exampleSaveError, setExampleSaveError] = useState('');
        const [similar, setSimilar] = useState(null);
        const [similarError, setSimilarError] = useState(false);
        const [saving, setSaving] = useState(null);
        const [saveError, setSaveError] = useState('');
        const [savingGrammar, setSavingGrammar] = useState(null);
        const [grammarSaveError, setGrammarSaveError] = useState('');
        const unknownGrammar = unknownWordGrammar(grammar, token.start, token.end);
        const sortedGrammar = [...grammar].sort((left, right) => Number(appliesToWord(right, token.start, token.end)) - Number(appliesToWord(left, token.start, token.end)));
        async function setGrammarKnown(rule) {
            if (savingGrammar !== null)
                return;
            setSavingGrammar(rule.slug);
            setGrammarSaveError('');
            try {
                const response = await requestReading(text, 'grammar', {}, {
                    method: 'POST', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
                    body: JSON.stringify({ slug: rule.slug, known: rule.proficiency < 4 }),
                });
                if (!response.ok)
                    throw new Error('Could not save grammar status. Try again.');
                onGrammarChange(await response.json());
            }
            catch (error) {
                setGrammarSaveError(error instanceof Error ? error.message : 'Could not save grammar status.');
            }
            finally {
                setSavingGrammar(null);
            }
        }
        useEffect(() => {
            if (tab !== 'context' || context || contextError)
                return;
            const controller = new AbortController();
            requestReading(text, 'context', { start: token.start }, { cache: 'no-store', signal: controller.signal })
                .then(response => { if (!response.ok)
                throw new Error('Context unavailable'); return response.json(); })
                .then(setContext)
                .catch(() => { if (!controller.signal.aborted)
                setContextError(true); });
            return () => controller.abort();
        }, [tab, context, contextError, id, token.start]);
        useEffect(() => {
            if (!capability.characters || (tab !== 'components' && tab !== 'definition') || (token.word.length === 1 && !lookup) || characters || charactersError)
                return;
            const controller = new AbortController();
            requestReading(text, 'characters', { start: token.start }, { cache: 'no-store', signal: controller.signal })
                .then(response => { if (!response.ok)
                throw new Error('Components unavailable'); return response.json(); })
                .then(setCharacters)
                .catch(() => { if (!controller.signal.aborted)
                setCharactersError(true); });
            return () => controller.abort();
        }, [tab, characters, charactersError, id, token.start, token.word, lookup]);
        useEffect(() => {
            if (tab !== 'examples' || examples || examplesError)
                return;
            const controller = new AbortController();
            requestReading(text, 'examples', { start: token.start }, { cache: 'no-store', signal: controller.signal })
                .then(response => { if (!response.ok)
                throw new Error('Examples unavailable'); return response.json(); })
                .then(setExamples)
                .catch(() => { if (!controller.signal.aborted)
                setExamplesError(true); });
            return () => controller.abort();
        }, [tab, examples, examplesError, id, token.start]);
        useEffect(() => {
            if (tab !== 'similar' || similar || similarError)
                return;
            const controller = new AbortController();
            requestReading(text, 'similar', { start: token.start }, { cache: 'no-store', signal: controller.signal })
                .then(response => { if (!response.ok)
                throw new Error('Similar words unavailable'); return response.json(); })
                .then(setSimilar)
                .catch(() => { if (!controller.signal.aborted)
                setSimilarError(true); });
            return () => controller.abort();
        }, [tab, similar, similarError, id, token.start]);
        async function setLevel(level) {
            if (saving !== null || level === token.proficiency)
                return;
            setSaving(level);
            setSaveError('');
            try {
                const response = await requestReading(text, 'proficiency', {}, {
                    method: 'POST', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
                    body: JSON.stringify({ start: token.start, proficiency: level }),
                });
                if (!response.ok)
                    throw new Error('Lexirise could not save this word. Try again.');
                onProficiency(level);
            }
            catch (error) {
                setSaveError(error instanceof Error ? error.message : 'Could not save this word.');
            }
            finally {
                setSaving(null);
            }
        }
        async function askQuestion(event) {
            event.preventDefault();
            const question = contextQuestion.trim();
            if (!question || questionBusy)
                return;
            setQuestionBusy(true);
            setQuestionError('');
            try {
                const response = await requestReading(text, 'context', {}, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Reader-Action': 'lexirise' },
                    body: JSON.stringify({ start: token.start, question }),
                });
                if (!response.ok)
                    throw new Error('Lexirise could not answer that question. Try again.');
                const result = await response.json();
                setQuestionAnswer(result.meaning || 'No answer was returned.');
            }
            catch (error) {
                setQuestionError(error instanceof Error ? error.message : 'Could not get an answer.');
            }
            finally {
                setQuestionBusy(false);
            }
        }
        async function saveExample(index) {
            if (savingExample !== null || savedExamples[index])
                return;
            setSavingExample(index);
            setExampleSaveError('');
            try {
                const response = await requestReading(text, 'save-example', { start: token.start, index }, {
                    method: 'POST', headers: { 'X-Reader-Action': 'lexirise' },
                });
                if (!response.ok)
                    throw new Error('Lexirise could not save this example. Try again.');
                setSavedExamples(previous => ({ ...previous, [index]: true }));
            }
            catch (error) {
                setExampleSaveError(error instanceof Error ? error.message : 'Could not save this example.');
            }
            finally {
                setSavingExample(null);
            }
        }
        return _jsx(Popover.Root, { open: true, modal: false, onOpenChange: (open, details) => {
                // The reader's composed-path click handler owns outside dismissal across
                // shadow roots. Closing on pointerdown would reopen a same-word click.
                if (details.reason === 'outside-press' || details.reason === 'focus-out') {
                    details.allowPropagation();
                    details.cancel();
                    return;
                }
                if (!open)
                    onClose();
            }, children: _jsx(Popover.Portal, { container: getPortalContainer(), children: _jsx(Popover.Positioner, { anchor: anchor, side: "bottom", sideOffset: 8, align: "start", positionMethod: "fixed", collisionPadding: 12, collisionAvoidance: { side: 'flip', align: 'shift', fallbackAxisSide: 'none' }, className: "word-sheet-positioner", children: _jsxs(Popover.Popup, { className: "word-sheet", initialFocus: keyboard, finalFocus: keyboard ? () => anchor : false, children: [_jsx(Popover.Close, { className: "word-sheet-close", "aria-label": "Close word lookup", children: _jsx(X, { size: 17 }) }), _jsxs("div", { className: "word-sheet-top", children: [_jsxs("div", { className: "word-sheet-identity", children: [_jsxs("div", { className: "word-sheet-headword", children: [_jsx(Popover.Title, { className: "word-sheet-title", style: enabled(options.toneColors, token.proficiency < 4) ? toneStyle(token.tones || [], token.word, options.palette) : undefined, children: token.word }), _jsx("button", { type: "button", className: "word-speak", onClick: () => speakChinese(token.word), title: "Speak using this device's source-language voice", "aria-label": `Pronounce ${token.word}`, children: _jsx(Play, { size: 17, fill: "currentColor" }) })] }), _jsxs("div", { className: "word-sheet-reading", children: [token.pinyin, lookup?.alternateReadings?.length ? ` · ${lookup.alternateReadings.join(' · ')}` : ''] }), enabled(options.zhuyin, token.proficiency < 4) && token.zhuyin && _jsx("div", { className: "word-sheet-zhuyin", children: token.zhuyin })] }), _jsx("div", { className: "word-levels", role: "group", "aria-label": "Lexirise vocabulary status", children: WORD_LEVELS.map(level => _jsx("button", { type: "button", className: token.proficiency === level.value ? `active level-${level.value}` : '', disabled: saving !== null, onClick: () => void setLevel(level.value), title: level.label, "aria-label": `Mark ${token.word} ${level.label}`, "aria-pressed": token.proficiency === level.value, children: saving === level.value ? '…' : level.short }, level.value)) })] }), saveError && _jsx("p", { className: "word-sheet-error", role: "alert", children: saveError }), _jsx("div", { className: "word-tabs", role: "tablist", "aria-label": "Word details", children: ['definition', 'grammar', 'context', 'examples', 'similar', 'components'].filter(value => (value !== 'components' || capability.characters) && (value !== 'grammar' || capability.grammar)).map(value => _jsx("button", { type: "button", role: "tab", "aria-selected": tab === value, className: tab === value ? 'active' : '', onClick: () => setTab(value), children: value[0].toUpperCase() + value.slice(1) }, value)) }), _jsxs("div", { className: "word-sheet-body", role: "tabpanel", children: [tab === 'definition' && (unknownGrammar.length > 0 || analysisPending) &&
                                        _jsxs("section", { className: "word-grammar-summary", "aria-label": "Unknown grammar for this word", children: [_jsx("small", { children: "Unknown grammar" }), unknownGrammar.slice(0, 3).map(rule => _jsxs("button", { type: "button", title: `${rule.title}: ${rule.subtitle}`, onClick: () => setTab('grammar'), children: [_jsx("strong", { lang: language, dir: capability.direction, children: rule.title }), _jsx("span", { children: rule.subtitle })] }, rule.slug)), unknownGrammar.length > 3 && _jsxs("button", { type: "button", className: "word-grammar-more", onClick: () => setTab('grammar'), children: ["+", unknownGrammar.length - 3, " more"] }), analysisPending && _jsx("small", { children: "Checking grammar\u2026" })] }), tab === 'grammar' && _jsxs("div", { className: "word-grammar-details", children: [_jsx("h3", { children: "Grammar in this sentence" }), _jsx("p", { className: "word-grammar-sentence", lang: language, dir: capability.direction, children: text }), analysisPending && _jsxs("p", { className: "word-grammar-note", children: ["Detailed analysis is still running.", _jsx("button", { type: "button", onClick: onGrammarRetry, children: "Check again" })] }), !grammar.length && !analysisPending && _jsxs("p", { children: ["No grammar rules were returned for this sentence.", _jsx("button", { type: "button", className: "word-retry", onClick: onGrammarRetry, children: "Retry grammar analysis" })] }), sortedGrammar.map(rule => _jsxs("article", { className: `${rule.proficiency >= 4 ? 'is-known' : ''} ${appliesToWord(rule, token.start, token.end) ? 'uses-selected-word' : ''}`, children: [_jsxs("div", { className: "word-grammar-heading", children: [_jsxs("a", { href: grammarUrl(rule.slug, language), target: "_blank", rel: "noopener noreferrer", "aria-label": `Read about ${rule.title} on Lexirise`, children: [_jsx("strong", { lang: language, dir: capability.direction, children: rule.title }), _jsx("span", { children: "\u2197" })] }), rule.level && _jsx("small", { children: rule.level })] }), _jsx("p", { children: rule.subtitle }), _jsx("div", { className: "word-grammar-examples", lang: language, dir: capability.direction, children: rule.examples.map((example, index) => _jsx("span", { children: example }, index)) }), _jsxs("div", { className: "word-grammar-actions", children: [_jsxs("small", { children: [rule.proficiency >= 4 ? 'Known' :
                                                                        WORD_LEVELS.find(level => level.value === rule.proficiency)?.label || 'Unknown', rule.localOverride ? ' · Local' : '', appliesToWord(rule, token.start, token.end) ? ' · Uses this word' : ''] }), _jsx("button", { type: "button", disabled: savingGrammar !== null, onClick: () => void setGrammarKnown(rule), children: savingGrammar === rule.slug ? 'Saving…' : rule.proficiency >= 4 ? 'Mark unknown' : 'Mark known' })] })] }, rule.slug)), grammarSaveError && _jsx("p", { className: "word-sheet-error", role: "alert", children: grammarSaveError }), _jsx("small", { className: "word-grammar-note", children: "Status changes are saved on this browser. Lexirise's API currently provides read-only grammar states; use the rule links to read more or update them on Lexirise." })] }), !lookup && !lookupError && (tab === 'definition' || (tab === 'components' && token.word.length === 1)) &&
                                        _jsxs("p", { children: [token.meaning || 'Looking up word details…', _jsx("small", { className: "word-loading-note", children: "Loading dictionary details\u2026" })] }), lookupError && (tab === 'definition' || (tab === 'components' && token.word.length === 1)) &&
                                        _jsxs("p", { children: ["Dictionary details are unavailable. ", token.meaning, _jsx("button", { type: "button", className: "word-retry", onClick: onRetry, children: "Retry dictionary lookup" })] }), tab === 'definition' && lookup && _jsxs(_Fragment, { children: [_jsx("div", { className: "word-definition-senses", children: lookup.translations.length ? lookup.translations.map((sense, index) => _jsxs("div", { className: "word-definition-lead", children: [_jsx("span", { children: sense.meaning }), sense.partOfSpeech.map((part, partIndex) => _jsx("span", { className: "word-pos", children: part }, partIndex))] }, index)) : _jsx("p", { children: token.meaning || 'No definition yet' }) }), lookup.hskLevel != null && _jsxs("span", { className: "word-hsk", children: ["HSK ", lookup.hskLevel] }), token.word.length > 1 && _jsxs("section", { className: "word-character-summary", children: [_jsx("h3", { children: "Characters" }), characters ? _jsx("div", { className: "word-character-summary-list", children: characters.characters.map((character, index) => _jsxs("div", { className: "word-character-summary-item", children: [_jsxs("span", { children: [_jsx("small", { children: character.pinyin?.join(' · ') }), _jsx("strong", { children: character.character })] }), _jsx("p", { children: character.gloss || (character.unavailable ? 'Details unavailable' : '') })] }, index)) }) : _jsx("p", { children: charactersError ? _jsx("button", { type: "button", className: "word-retry", onClick: () => setCharactersError(false), children: "Retry character details" }) : 'Loading character details…' })] }), lookup.dictionaries.map((dictionary, index) => _jsxs("section", { className: "word-dictionary", children: [_jsx("h3", { children: dictionary.name }), _jsxs("p", { children: [_jsx("strong", { children: dictionary.headword }), " ", _jsx("span", { children: dictionary.reading })] }), _jsx("ul", { children: dictionary.definitions.map((meaning, item) => _jsx("li", { children: meaning }, item)) })] }, index)), token.word.length === 1 ? _jsx(DefinitionComponents, { character: lookup.character || token.word, options: options, hint: lookup.characterHint, strokeCount: lookup.strokeCount, components: characters?.characters[0]?.components || lookup.components }) :
                                                characters?.characters.map((character, index) => _jsx(DefinitionComponents, { options: options, character: character.character, hint: character.hint, strokeCount: character.strokeCount, components: character.components }, index)), charactersError && _jsx("button", { type: "button", className: "word-retry", onClick: () => setCharactersError(false), children: "Retry component details" }), characters?.partial && _jsx("button", { type: "button", className: "word-retry", onClick: () => setCharacters(null), children: "Retry missing character explanations" }), lookup.rank != null && _jsxs("div", { className: "word-frequency", children: [_jsx("span", { children: "Frequency" }), lookup.frequencyScore != null && _jsx("span", { className: "word-frequency-bars", "aria-label": `Frequency score ${Math.round(lookup.frequencyScore * 100)} percent`, children: Array.from({ length: 4 }, (_, index) => _jsx("i", { className: lookup.frequencyScore >= (index + 1) / 4 ? 'on' : '' }, index)) }), _jsx("span", { children: lookup.rank <= 100 ? 'Very common' : lookup.rank <= 5000 ? 'Common' : 'Less common' }), _jsxs("span", { children: ["#", lookup.rank.toLocaleString()] })] })] }), tab === 'context' && _jsxs("div", { className: "word-context", children: [_jsx("p", { lang: language, dir: capability.direction, children: text }), context ? _jsxs(_Fragment, { children: [_jsx("strong", { children: context.conciseMeaning || token.meaning }), _jsx("p", { children: context.meaning }), context.reading && _jsxs("small", { children: ["In this line: ", context.reading] })] }) :
                                                _jsx("p", { children: contextError ? _jsxs(_Fragment, { children: ["Context explanation unavailable.", _jsx("button", { type: "button", className: "word-retry", onClick: () => setContextError(false), children: "Retry context" })] }) :
                                                        'Explaining this word in the line…' }), questionAnswer && _jsx("div", { className: "word-context-answer", children: questionAnswer }), _jsxs("form", { className: "word-context-question", onSubmit: event => void askQuestion(event), children: [_jsx("input", { value: contextQuestion, maxLength: 500, onChange: event => setContextQuestion(event.target.value), placeholder: "Ask about nuance, grammar, or tone", "aria-label": "Ask Lexirise about this word" }), _jsx("button", { type: "submit", disabled: !contextQuestion.trim() || questionBusy, "aria-label": "Ask Lexirise", children: questionBusy ? '…' : '↑' })] }), questionError && _jsx("p", { className: "word-sheet-error", role: "alert", children: questionError })] }), tab === 'examples' && _jsxs("div", { className: "word-examples", children: [examples ? examples.examples.length ? examples.examples.map((example, index) => _jsxs("article", { className: "word-example", children: [_jsxs("div", { className: "word-example-main", children: [_jsx(ExampleChinese, { text: example.text, tokens: example.tokens, options: options }), _jsx("p", { children: example.translation })] }), _jsxs("div", { className: "word-example-actions", children: [_jsx("button", { type: "button", onClick: () => speakChinese(example.text), title: "Play with this device's Chinese voice", "aria-label": `Play example ${index + 1}`, children: _jsx(Volume2, { size: 18 }) }), _jsx("button", { type: "button", onClick: () => void saveExample(index), disabled: savingExample !== null || savedExamples[index], className: savedExamples[index] ? 'saved' : '', title: "Save example sentence to Lexirise (text only)", "aria-label": savedExamples[index] ? `Example ${index + 1} saved` : `Save example ${index + 1} to Lexirise`, children: _jsx(Bookmark, { size: 18 }) })] })] }, index)) : _jsx("p", { children: "Lexirise has no example sentences for this word." }) :
                                                _jsx("p", { children: examplesError ? _jsxs(_Fragment, { children: ["Examples unavailable.", _jsx("button", { type: "button", className: "word-retry", onClick: () => setExamplesError(false), children: "Retry examples" })] }) : 'Loading examples…' }), exampleSaveError && _jsx("p", { className: "word-sheet-error", role: "alert", children: exampleSaveError }), _jsx("small", { children: "Example playback uses this device\u2019s Chinese speech voice. Bookmarks save text and translation to Lexirise." })] }), tab === 'similar' && _jsxs("div", { className: "word-similar", children: [_jsx("h3", { children: "Close in meaning" }), similar ? similar.suggestions.length ? similar.suggestions.map((suggestion, index) => _jsxs("article", { children: [_jsx("span", { className: "word-similar-reading", children: suggestion.pinyin }), _jsx("strong", { style: enabled(options.toneColors, true) ? toneStyle(suggestion.tones || [], suggestion.word, options.palette) : undefined, children: suggestion.word }), _jsx("p", { children: suggestion.meaning }), _jsx("small", { children: suggestion.usage })] }, index)) : _jsx("p", { children: "Lexirise did not return verified similar words for this use." }) :
                                                _jsx("p", { children: similarError ? _jsxs(_Fragment, { children: ["Similar words unavailable.", _jsx("button", { type: "button", className: "word-retry", onClick: () => setSimilarError(false), children: "Retry similar words" })] }) : 'Finding similar words…' }), _jsx("small", { children: "Usage notes are AI suggestions; each displayed word was checked against Lexirise\u2019s dictionary." })] }), tab === 'components' && _jsxs("div", { className: "word-components", children: [token.word.length > 1 ? characters ? characters.characters.map((character, charIndex) => _jsxs("section", { className: "word-character", children: [_jsxs("h3", { children: [character.character, " ", character.strokeCount != null && _jsxs("small", { children: [character.strokeCount, " strokes"] })] }), character.hint && _jsx("p", { children: character.hint }), character.unavailable && _jsx("p", { children: "Character details unavailable right now." }), character.components.map((part, index) => _jsxs("div", { className: "word-component", children: [_jsx("strong", { children: part.character }), _jsxs("span", { children: [part.type.join(', ') || 'Component', part.hint && _jsx("small", { children: part.hint })] })] }, index))] }, charIndex)) : _jsx("p", { children: charactersError ? _jsxs(_Fragment, { children: ["Character details are unavailable.", _jsx("button", { type: "button", className: "word-retry", onClick: () => setCharactersError(false), children: "Retry components" })] }) :
                                                    'Loading character components…' }) : lookup && _jsxs(_Fragment, { children: [lookup.characterHint && _jsx("p", { children: lookup.characterHint }), lookup.strokeCount != null && _jsxs("small", { children: [lookup.strokeCount, " strokes"] }), lookup.components.length ? lookup.components.map((part, index) => _jsxs("div", { className: "word-component", children: [_jsx("strong", { children: part.character }), _jsxs("span", { children: [part.type.join(', ') || 'Component', part.hint && _jsx("small", { children: part.hint })] })] }, index)) : _jsx("p", { children: "Lexirise has no character components for this word." })] }), token.word.length > 1 && characters?.partial && _jsx("button", { type: "button", className: "word-retry", onClick: () => setCharacters(null), children: "Retry missing characters" })] })] })] }) }) }) });
    }
    const ReadingText = memo(function ReadingText({ id, text, options, current = false, onSummary }) {
        const [reading, setReading] = useState(cachedReading(id, text));
        const [open, setOpen] = useState(null);
        const [anchor, setAnchor] = useState(null);
        const [keyboard, setKeyboard] = useState(false);
        const [lookup, setLookup] = useState(null);
        const [lookupAttempt, setLookupAttempt] = useState(0);
        const [error, setError] = useState(false);
        const refreshReading = useRef(null);
        useEffect(() => {
            const dismiss = (event) => {
                const path = event.composedPath();
                if (path.some(node => node instanceof Element && (node.classList.contains('word-sheet') || node.classList.contains('reading-hanzi'))))
                    return;
                setOpen(null);
            };
            const otherWord = (event) => { if (event.detail !== id)
                setOpen(null); };
            const escape = (event) => { if (event.key === 'Escape')
                setOpen(null); };
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
            let timer;
            let refreshCount = 0;
            const refreshDelays = [800, 1200, 1800, 2600, 3800, 5600, 8000, 12000, 16000, 20000];
            setOpen(null);
            const saved = cachedReading(id, text);
            setReading(saved);
            async function refresh() {
                try {
                    const response = await requestReading(text, 'analysis', {}, { cache: 'no-store' });
                    if (!response.ok)
                        throw new Error('Analysis unavailable');
                    const result = applyOverrides(await response.json());
                    if (!active)
                        return;
                    cache.set(id, { reading: result, at: Date.now() });
                    if (cache.size > 250)
                        cache.delete(cache.keys().next().value);
                    setReading(result);
                    setError(false);
                    if ((result.pendingMeanings || result.analysisPending) && refreshCount < refreshDelays.length) {
                        timer = setTimeout(refresh, refreshDelays[refreshCount++]);
                    }
                }
                catch {
                    if (active)
                        setError(true);
                }
            }
            refreshReading.current = refresh;
            if (!saved || saved.pendingMeanings || saved.analysisPending)
                void refresh();
            const onChange = () => setReading(previous => previous ? applyOverrides(previous) : previous);
            window.addEventListener('lexirise-word-state', onChange);
            window.addEventListener('lexirise-grammar-state', onChange);
            return () => {
                active = false;
                if (timer)
                    clearTimeout(timer);
                refreshReading.current = null;
                window.removeEventListener('lexirise-word-state', onChange);
                window.removeEventListener('lexirise-grammar-state', onChange);
            };
        }, [id, text]);
        useEffect(() => {
            if (open === null || !reading || reading.text !== text)
                return;
            const token = reading.tokens[open];
            if (!token)
                return;
            const key = `${text}:${token.start}:${token.word}`;
            const saved = lookupCache.get(key);
            if (saved) {
                setLookup({ index: open, value: saved });
                return;
            }
            let active = true;
            setLookup({ index: open });
            requestReading(text, 'lookup', { start: token.start }, { cache: 'no-store' })
                .then(response => { if (!response.ok)
                throw new Error('Lookup unavailable'); return response.json(); })
                .then(value => { lookupCache.set(key, value); if (lookupCache.size > 500)
                lookupCache.delete(lookupCache.keys().next().value); if (active)
                setLookup({ index: open, value }); })
                .catch(() => { if (active)
                setLookup({ index: open, error: true }); });
            return () => { active = false; };
        }, [id, open, reading, text, lookupAttempt]);
        function onProficiency(level) {
            if (!reading || open === null)
                return;
            const entryId = reading.tokens[open]?.entryId;
            if (entryId == null)
                return;
            proficiencyOverrides.set(entryId, level);
            for (const [lineId, saved] of cache)
                cache.set(lineId, { ...saved, reading: applyOverrides(saved.reading) });
            notify('lexirise-word-state');
        }
        function onGrammarChange(rule) {
            grammarOverrides.set(rule.slug, { proficiency: rule.proficiency, localOverride: rule.localOverride });
            for (const [lineId, saved] of cache)
                cache.set(lineId, { ...saved, reading: applyOverrides(saved.reading) });
            notify('lexirise-grammar-state');
        }
        if (!reading || reading.text !== text)
            return _jsxs("p", { className: current ? 'current-chinese' : undefined, lang: language, dir: capability.direction, title: error ? 'Lexirise analysis unavailable' : 'Analyzing with Lexirise', children: [text, error && _jsx("button", { className: "reading-retry", type: "button", onClick: () => void refreshReading.current?.(), children: "Retry Lexirise" })] });
        const parts = [];
        let cursor = 0;
        for (const [index, token] of reading.tokens.entries()) {
            if (token.start < cursor || token.end > text.length)
                continue;
            if (token.start > cursor)
                parts.push(text.slice(cursor, token.start));
            const unknown = token.proficiency < 4;
            const wordText = text.slice(token.start, token.end);
            const colorStyle = enabled(options.toneColors, unknown)
                ? toneStyle(token.tones || [], wordText, options.palette) : undefined;
            const toneMarks = token.tones?.map(value => TONE_MARKS[value] || '').filter(Boolean).join(' ');
            parts.push(_jsxs("span", { className: "reading-token", children: [enabled(options.toneMarks, unknown) && !!toneMarks && _jsx("span", { className: "reading-tone-marks", "aria-hidden": "true", children: toneMarks }), enabled(options.pinyin, unknown) && !!token.pinyin && _jsx("span", { className: "reading-pinyin", "aria-hidden": "true", children: token.pinyin }), enabled(options.zhuyin, unknown) && !!token.zhuyin && _jsx("span", { className: "reading-zhuyin", "aria-hidden": "true", children: token.zhuyin }), _jsx("span", { className: "reading-hanzi", role: "button", tabIndex: 0, "aria-haspopup": "dialog", "aria-expanded": open === index, onClick: event => { event.stopPropagation(); notify('lexirise-open-word', id); setAnchor(event.currentTarget); setKeyboard(false); setOpen(open === index ? null : index); }, onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            notify('lexirise-open-word', id);
                            setAnchor(event.currentTarget);
                            setKeyboard(true);
                            setOpen(open === index ? null : index);
                        } }, style: colorStyle, title: token.meaning || 'Tap for word details', children: wordText }), enabled(options.meanings, unknown) && !!token.meaning && _jsx("span", { className: "reading-meaning", children: shortGloss(token.meaning) })] }, `${token.start}-${index}`));
            cursor = token.end;
        }
        if (cursor < text.length)
            parts.push(text.slice(cursor));
        const selected = open === null ? null : reading.tokens[open];
        return _jsxs(_Fragment, { children: [_jsx("p", { className: `reading-text ${current ? 'current-chinese' : ''}`, lang: language, dir: capability.direction, children: parts }), selected && anchor && _jsx(WordSheet, { id: id, text: text, token: selected, options: options, anchor: anchor, keyboard: keyboard, grammar: reading.grammar || [], analysisPending: !!reading.analysisPending, onGrammarChange: onGrammarChange, onGrammarRetry: () => void refreshReading.current?.(), lookup: lookup?.index === open ? lookup.value : undefined, lookupError: lookup?.index === open && !!lookup.error, onClose: () => setOpen(null), onProficiency: onProficiency, onRetry: () => { setLookup(null); setLookupAttempt(value => value + 1); } }, `${id}:${selected.start}`)] });
    });
    return { ReadingText, LookupWindow: WordSheet, resetReadingCaches };
}
const boundReaders = new WeakMap();
function bound(adapter) {
    let result = boundReaders.get(adapter);
    if (!result) {
        result = createReader(adapter);
        boundReaders.set(adapter, result);
    }
    return result;
}
export function Reader({ adapter, ...props }) {
    const Component = bound(adapter).ReadingText;
    return _jsx(Component, { ...props });
}
export function LookupWindow({ adapter, ...props }) {
    const Component = bound(adapter).LookupWindow;
    return _jsx(Component, { ...props });
}
