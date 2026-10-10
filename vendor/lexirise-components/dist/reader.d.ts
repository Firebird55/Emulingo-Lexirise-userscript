import { type StudyLanguage } from './capabilities.js';
import { type ReadingSummary, type TranslationLimit } from './translation-visibility.js';
import { type GrammarRule } from './grammar-rules.js';
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
export declare const DEFAULT_TONE_PALETTE: ReadingOptions['palette'];
/** @deprecated Use DEFAULT_TONE_PALETTE. Saved colors are unchanged. */
export declare const MIGAKU_TONE_PALETTE: [string, string, string, string, string, ...string[]];
export declare const DEFAULT_READING_OPTIONS: ReadingOptions;
export declare function isReadingScope(value: unknown): value is ReadingScope;
export declare function restoreReadingOptions(value: unknown): ReadingOptions;
export type Token = {
    start: number;
    end: number;
    word: string;
    pinyin: string;
    zhuyin: string;
    tones: number[];
    proficiency: number;
    meaning: string;
    entryId?: number | null;
};
export type Reading = {
    text: string;
    tokens: Token[];
    pendingMeanings?: boolean;
    analysisPending?: boolean;
    grammar?: GrammarRule[];
};
type Component = {
    character: string;
    type: string[];
    hint: string;
    pinyin?: string[];
    gloss?: string;
    characterHint?: string;
};
export type Lookup = {
    sourceLanguage?: string;
    translationLanguage?: string;
    translations: {
        meaning: string;
        partOfSpeech: string[];
        examples: {
            text: string;
            translation: string;
        }[];
    }[];
    examples: {
        text: string;
        translation: string;
    }[];
    dictionaries: {
        name: string;
        headword: string;
        reading: string;
        definitions: string[];
    }[];
    hskLevel?: number;
    rank?: number;
    frequencyScore?: number;
    alternateReadings: string[];
    components: Component[];
    characterHint?: string;
    strokeCount?: number;
    character?: string;
};
export declare function enabled(scope: ReadingScope, unknown: boolean): boolean;
export declare function toneStyle(tones: number[], text: string, palette: ReadingOptions['palette']): React.CSSProperties | undefined;
export type ReaderAdapter = {
    sourceLanguage: StudyLanguage;
    translationLanguage: string;
    request: (text: string, action: string, params?: {
        start?: number;
        index?: number;
    }, init?: RequestInit) => Promise<Response>;
    portalContainer?: () => HTMLElement | undefined;
};
export declare function createReader(adapter: ReaderAdapter): {
    ReadingText: import("react").NamedExoticComponent<{
        id: number;
        text: string;
        options: ReadingOptions;
        current?: boolean;
        onSummary?: (summary: ReadingSummary) => void;
    }>;
    LookupWindow: ({ id, text, token, lookup, lookupError, options, anchor, keyboard, grammar, analysisPending, onGrammarChange, onGrammarRetry, onClose, onProficiency, onRetry }: {
        id: number;
        text: string;
        token: Token;
        lookup?: Lookup;
        lookupError: boolean;
        anchor: HTMLElement;
        keyboard: boolean;
        options: ReadingOptions;
        onClose: () => void;
        onProficiency: (level: number) => void;
        onRetry: () => void;
        grammar: GrammarRule[];
        analysisPending: boolean;
        onGrammarChange: (rule: {
            slug: string;
            proficiency: number;
            localOverride: boolean;
        }) => void;
        onGrammarRetry: () => void;
    }) => import("react/jsx-runtime").JSX.Element;
    resetReadingCaches: () => void;
};
export declare function Reader({ adapter, ...props }: {
    adapter: ReaderAdapter;
} & React.ComponentProps<ReturnType<typeof createReader>['ReadingText']>): import("react/jsx-runtime").JSX.Element;
export declare function LookupWindow({ adapter, ...props }: {
    adapter: ReaderAdapter;
} & React.ComponentProps<ReturnType<typeof createReader>['LookupWindow']>): import("react/jsx-runtime").JSX.Element;
export {};
