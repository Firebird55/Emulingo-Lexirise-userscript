import { isStudyLanguage } from './capabilities.js';
export const globalFields = ['translationLanguage', 'interfaceLanguage', 'disableWordPopups', 'wordPopupOpenMode', 'useCustomProficiencyColors', 'customProficiencyColors'];
export const languageFields = ['readingAid', 'readingAboveWords', 'script', 'inlineGlossMode', 'coloringMode', 'toneColorPreset', 'customToneColors', 'colorKnownWordsToo', 'emphasizeFrequencyLevel', 'wordSpacing', 'ttsOnWordClick', 'automaticGrammarHighlighting', 'highlightProperNouns', 'customFont', 'fontSize', 'segmentByCharacter', 'dictionariesEnabled', 'dictionaries', 'wordPopup'];
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function diffFields(before, after, fields) {
    const patch = {};
    for (const key of fields)
        if (key in after && !equal(before[key], after[key])) {
            if (key === 'customProficiencyColors' && after[key] && typeof after[key] === 'object') {
                const changed = {};
                for (const state of ['unknown', 'tracked', 'learning', 'fresh', 'known'])
                    if (state in after[key] && !equal(before[key]?.[state], after[key][state]))
                        changed[state] = after[key][state];
                if (Object.keys(changed).length)
                    patch[key] = changed;
            }
            else
                patch[key] = after[key];
        }
    return patch;
}
export function settingsPatch(before, after) {
    const patch = {};
    if (!equal(before.languages, after.languages)) {
        if (!after.languages.length || !after.languages.every(isStudyLanguage))
            throw new Error('Select at least one supported study language.');
        patch.languages = [...after.languages];
    }
    const global = diffFields(before.global, after.global, globalFields);
    if (Object.keys(global).length)
        patch.global = global;
    const languageSettings = {};
    for (const [lang, settings] of Object.entries(after.languageSettings)) {
        if (!isStudyLanguage(lang))
            continue;
        const changes = diffFields(before.languageSettings[lang] ?? {}, settings, languageFields);
        if (Object.keys(changes).length)
            languageSettings[lang] = changes;
    }
    if (Object.keys(languageSettings).length)
        patch.languageSettings = languageSettings;
    return patch;
}
export function validateAccount(value) {
    const result = value;
    if (!result || !Array.isArray(result.languages) || !result.global || typeof result.global !== 'object' || !result.languageSettings || typeof result.languageSettings !== 'object')
        throw new Error('Lexirise returned invalid settings.');
    return structuredClone(result);
}
