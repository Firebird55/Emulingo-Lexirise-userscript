'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { capabilities, studyLanguages, translationLanguages } from './capabilities.js';
import { globalFields, languageFields, settingsPatch, validateAccount } from './account.js';
import { MIGAKU_TONE_PALETTE, restoreReadingOptions } from './reader.js';
import { restoreTranslationLimit } from './translation-visibility.js';
export function restoreLocalSettings(value) {
    const saved = value;
    return { ...restoreReadingOptions(value), fontSize: typeof saved?.fontSize === 'number' && saved.fontSize >= 18 && saved.fontSize <= 48 ? saved.fontSize : 27,
        sourceLanguage: saved?.sourceLanguage === 'auto' || (saved?.sourceLanguage && saved.sourceLanguage in capabilities) ? saved.sourceLanguage : 'auto',
        translationLanguage: translationLanguages.includes(saved?.translationLanguage) ? saved.translationLanguage : 'en' };
}
const labels = { pinyin: 'Pronunciation readings', zhuyin: 'Zhuyin', toneMarks: 'Separate tone marks', meanings: 'Inline glosses', toneColors: 'Tone colors' };
const choices = { interfaceLanguage: ['translation', 'device', ...translationLanguages], translationLanguage: translationLanguages, wordPopupOpenMode: ['click', 'hover'], inlineGlossMode: ['off', 'unknown', 'all'], coloringMode: ['learning_state', 'tone'], toneColorPreset: ['lexirise', 'pleco', 'migaku', 'custom'], wordSpacing: ['none', 'sm', 'md', 'lg'], fontSize: ['sm', 'md', 'lg'], script: ['simplified', 'traditional'] };
function Field({ name, value, onChange, options }) {
    const [raw, setRaw] = useState(JSON.stringify(value ?? null, null, 2));
    const [invalid, setInvalid] = useState(false);
    useEffect(() => { setRaw(JSON.stringify(value ?? null, null, 2)); setInvalid(false); }, [value]);
    if ((value && typeof value === 'object') || ['wordPopup', 'customToneColors', 'customProficiencyColors', 'dictionaries'].includes(name))
        return _jsxs("label", { className: "reader-option-row", children: [_jsxs("span", { children: [name, _jsx("small", { children: "Structured setting, validated by Lexirise when saved." })] }), _jsx("textarea", { "aria-label": name, value: raw, onChange: e => { setRaw(e.target.value); try {
                        const next = JSON.parse(e.target.value);
                        onChange(next);
                        setInvalid(false);
                    }
                    catch {
                        setInvalid(true);
                    } }, "aria-invalid": invalid }), invalid && _jsx("small", { children: "Invalid JSON \u2014 this edit has not been applied." })] });
    const values = options ?? choices[name];
    return _jsxs("label", { className: "reader-option-row", children: [_jsx("span", { children: _jsx("strong", { children: name.replace(/([A-Z])/g, ' $1') }) }), typeof value === 'boolean' ? _jsx("input", { type: "checkbox", checked: value, "aria-label": name, onChange: e => onChange(e.target.checked) }) :
                values ? _jsxs("select", { "aria-label": name, value: value ?? '', onChange: e => onChange(e.target.value || null), children: [_jsx("option", { value: "", children: "Default" }), [...new Set([...values, ...(value ? [String(value)] : [])])].map(option => _jsx("option", { children: option }, option))] }) :
                    _jsx("input", { "aria-label": name, type: typeof value === 'number' ? 'number' : 'text', value: value ?? '', onChange: e => onChange(typeof value === 'number' ? Number(e.target.value) : e.target.value) })] });
}
export function SettingsPanel({ initial, onChange, onClose, adapter, connection, sourceLanguage = 'zh', sourceOverride = false }) {
    const [local, setLocal] = useState(initial), [original, setOriginal] = useState(null), [draft, setDraft] = useState(null), [editing, setEditing] = useState(sourceLanguage), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    async function reload() { setBusy(true); setMessage(''); try {
        const result = validateAccount(await adapter.load());
        setOriginal(result);
        setDraft(structuredClone(result));
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not load settings.');
    }
    finally {
        setBusy(false);
    } }
    useEffect(() => { void reload(); }, [adapter]);
    useEffect(() => { const key = (e) => { if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
    } }; window.addEventListener('keydown', key, true); const connected = () => void reload(); window.addEventListener('lexirise-credentials-changed', connected); return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('lexirise-credentials-changed', connected); }; }, [onClose, adapter]);
    function updateLocal(next) { setLocal(next); Promise.resolve(onChange(next)).catch(() => setMessage('Could not save local display preferences.')); }
    function updateGlobal(key, value) { setDraft(d => d ? { ...d, global: { ...d.global, [key]: value } } : d); }
    function updateLanguage(key, value) { setDraft(d => d ? { ...d, languageSettings: { ...d.languageSettings, [editing]: { ...d.languageSettings[editing], [key]: value } } } : d); }
    async function save() { if (!original || !draft)
        return; setBusy(true); setMessage(''); try {
        const patch = settingsPatch(original, draft);
        if (!Object.keys(patch).length) {
            setMessage('No account changes.');
            return;
        }
        const result = validateAccount(await adapter.patch(patch));
        setOriginal(result);
        setDraft(structuredClone(result));
        setMessage('Saved to Lexirise.');
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Could not save account settings. Your changes are still here.');
    }
    finally {
        setBusy(false);
    } }
    const cap = capabilities[editing], source = capabilities[sourceLanguage];
    const languageView = { readingAid: cap.readings[1] ?? null, readingAboveWords: cap.readings.length ? true : null, script: cap.scripts[0] ?? null,
        inlineGlossMode: 'off', coloringMode: 'learning_state', toneColorPreset: cap.tones ? 'lexirise' : null, customToneColors: cap.tones ? null : undefined, colorKnownWordsToo: false, emphasizeFrequencyLevel: 0, wordSpacing: 'md', ttsOnWordClick: cap.tts, automaticGrammarHighlighting: cap.grammar ? false : null, highlightProperNouns: true, customFont: '', fontSize: 'md', segmentByCharacter: cap.characters ? false : null, dictionariesEnabled: true, dictionaries: [], wordPopup: null, ...draft?.languageSettings[editing] };
    return _jsx("div", { className: "settings-backdrop", onClick: e => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("section", { className: "settings-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Lexirise reading options", onKeyDown: e => e.stopPropagation(), children: [_jsx("button", { className: "settings-close", type: "button", "aria-label": "Close Lexirise settings", onClick: onClose, children: "\u00D7" }), _jsx("h2", { children: "Lexirise reading options" }), _jsx("p", { className: "settings-description", children: "Local display changes apply immediately. Account changes require Save to Lexirise. Editing another study language does not change this transcript's language." }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Local display only" }), sourceOverride && _jsxs(_Fragment, { children: [_jsx(Field, { name: "Content source language", value: local.sourceLanguage ?? 'auto', options: ['auto', ...studyLanguages], onChange: v => updateLocal({ ...local, sourceLanguage: v }) }), _jsx(Field, { name: "Lookup translation language", value: local.translationLanguage ?? 'en', options: translationLanguages, onChange: v => updateLocal({ ...local, translationLanguage: v }) })] }), _jsxs("label", { className: "reader-option-row", children: [_jsxs("span", { children: [_jsx("strong", { children: "Hide English translation" }), _jsx("small", { children: "Hide translations at this unknown-word threshold; tap to reveal." })] }), _jsxs("select", { "aria-label": "Hide English translation", value: local.hideEnglishAt, onChange: e => updateLocal({ ...local, hideEnglishAt: restoreTranslationLimit(e.target.value === 'off' ? 'off' : Number(e.target.value)) }), children: [_jsx("option", { value: "off", children: "Always show" }), [0, 1, 2, 3].map(n => _jsxs("option", { value: n, children: [n, " or fewer unknown words"] }, n))] })] }), Object.entries(labels).filter(([key]) => key === 'meanings' || key === 'pinyin' && source.readings.length || key === 'zhuyin' && sourceLanguage === 'zh' || ['toneMarks', 'toneColors'].includes(key) && source.tones).map(([key, label]) => _jsxs("label", { className: "reader-option-row", children: [_jsx("span", { children: _jsx("strong", { children: label }) }), _jsxs("select", { "aria-label": label, value: local[key], onChange: e => updateLocal({ ...local, [key]: e.target.value }), children: [_jsx("option", { value: "unknown", children: "Unknown words" }), _jsx("option", { value: "all", children: "All words" }), _jsx("option", { value: "off", children: "Off" })] })] }, key)), _jsx(Field, { name: "Local text size", value: local.fontSize ?? 27, onChange: v => { if (v >= 18 && v <= 48)
                                updateLocal({ ...local, fontSize: v }); } }), !!source.tones && _jsxs("fieldset", { className: "reader-tone-palette", children: [_jsx("legend", { children: "Local tone palette" }), _jsx("div", { className: "reader-color-list", children: Array.from({ length: source.tones }, (_, i) => _jsxs("label", { children: [_jsx("input", { type: "color", "aria-label": 'Tone ' + (i + 1) + ' color', value: local.palette[i] ?? '#c084fc', onChange: e => { const palette = [...local.palette]; palette[i] = e.target.value; updateLocal({ ...local, palette }); } }), _jsxs("span", { children: ["Tone ", i + 1] })] }, i)) }), _jsx("button", { type: "button", onClick: () => updateLocal({ ...local, palette: [...MIGAKU_TONE_PALETTE] }), children: "Reset colors" })] })] }), connection, _jsxs("fieldset", { className: "settings-account", children: [_jsx("legend", { children: "Lexirise account settings" }), _jsxs("div", { className: "settings-actions", children: [_jsx("button", { type: "button", disabled: busy, onClick: () => void reload(), children: "Reload from Lexirise" }), _jsx("button", { type: "button", disabled: busy || !draft, onClick: () => void save(), children: "Save to Lexirise" }), _jsx("button", { type: "button", disabled: busy || !original, onClick: () => { setDraft(structuredClone(original)); setMessage('Account changes discarded.'); }, children: "Discard account changes" })] }), _jsx("p", { role: "status", children: busy ? 'Contacting Lexirise…' : message }), draft && _jsxs(_Fragment, { children: [_jsx("h3", { children: "Study languages" }), _jsx("div", { className: "study-languages", children: studyLanguages.map(code => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: draft.languages.includes(code), onChange: e => setDraft(d => d ? { ...d, languages: e.target.checked ? [...d.languages, code] : d.languages.filter(l => l !== code) } : d) }), capabilities[code].name] }, code)) }), _jsx("h3", { children: "Global preferences" }), globalFields.map(key => _jsx(Field, { name: key, value: draft.global[key], onChange: v => updateGlobal(key, v) }, key)), _jsx("h3", { children: "Per-language preferences" }), _jsx("select", { "aria-label": "Edit account language", value: editing, onChange: e => setEditing(e.target.value), children: studyLanguages.map(l => _jsx("option", { value: l, children: capabilities[l].name }, l)) }), languageFields.filter(key => key in languageView && (!['readingAid', 'readingAboveWords'].includes(key) || cap.readings.length) && (key !== 'script' || cap.scripts.length) && (!['customToneColors', 'toneColorPreset'].includes(key) || cap.tones) && (key !== 'automaticGrammarHighlighting' || cap.grammar) && (key !== 'segmentByCharacter' || languageView[key] !== null)).map(key => _jsx(Field, { name: key, value: languageView[key], options: key === 'readingAid' ? cap.readings : key === 'script' ? cap.scripts : undefined, onChange: v => updateLanguage(key, v) }, editing + key)), !draft.languageSettings[editing] && _jsx("p", { children: "Select this language in Study languages and save to load its default preferences. No other language's settings will be changed." }), _jsx("small", { children: "Structured popup, dictionary and palette fields preserve all options. Derived fields and native language are never sent." })] })] })] }) });
}
