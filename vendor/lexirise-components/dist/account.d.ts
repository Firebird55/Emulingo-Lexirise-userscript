import { type StudyLanguage } from './capabilities.js';
export type JsonObject = Record<string, any>;
export type AccountSettings = {
    languages: StudyLanguage[];
    native_lang?: string;
    global: JsonObject;
    languageSettings: Record<string, JsonObject>;
};
export type SettingsAdapter = {
    load: () => Promise<AccountSettings>;
    patch: (changes: JsonObject) => Promise<AccountSettings>;
};
export declare const globalFields: readonly ["translationLanguage", "interfaceLanguage", "disableWordPopups", "wordPopupOpenMode", "useCustomProficiencyColors", "customProficiencyColors"];
export declare const languageFields: readonly ["readingAid", "readingAboveWords", "script", "inlineGlossMode", "coloringMode", "toneColorPreset", "customToneColors", "colorKnownWordsToo", "emphasizeFrequencyLevel", "wordSpacing", "ttsOnWordClick", "automaticGrammarHighlighting", "highlightProperNouns", "customFont", "fontSize", "segmentByCharacter", "dictionariesEnabled", "dictionaries", "wordPopup"];
export declare function settingsPatch(before: AccountSettings, after: AccountSettings): JsonObject;
export declare function validateAccount(value: unknown): AccountSettings;
