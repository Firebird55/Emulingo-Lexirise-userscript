import type { AccountSettings } from './account.js';
export declare const WORD_POPUP_TABS: readonly ["definition", "translation", "context", "components", "examples", "similar", "words", "notes", "grammar"];
export declare const WORD_POPUP_SECTIONS: readonly ["senses", "breakdown", "dictionaries", "frequency"];
export type WordTab = typeof WORD_POPUP_TABS[number];
export type DefinitionSection = typeof WORD_POPUP_SECTIONS[number];
export type PopupItem<T extends string> = {
    id: T;
    enabled: boolean;
};
export type WordPopupSettings = {
    tabs: PopupItem<WordTab>[];
    definition: PopupItem<DefinitionSection>[];
    openOn: 'first' | 'last';
};
export declare function normalizeWordPopupSettings(value: unknown): WordPopupSettings;
export declare function validateWordPopupPatch(value: unknown): void;
export declare function orderWordPopupTabs(settings: WordPopupSettings, available: readonly WordTab[]): WordTab[];
export declare function orderWordPopupDefinitionSections(settings: WordPopupSettings, available: readonly DefinitionSection[]): DefinitionSection[];
export declare function resolveInitialWordPopupTab(tabs: readonly WordTab[], settings: WordPopupSettings, last: WordTab | null): WordTab | null;
export declare function popupPreferences(account: AccountSettings | null, language: string): {
    layout: WordPopupSettings;
    disabled: boolean;
    hover: boolean;
};
