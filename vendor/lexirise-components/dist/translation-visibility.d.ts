export type TranslationLimit = 'off' | 0 | 1 | 2 | 3;
export type ReadingSummary = {
    id: number;
    text: string;
    unknownWords: number | null;
};
export declare function restoreTranslationLimit(value: unknown): TranslationLimit;
export declare function countUnknownWords(text: string, tokens: {
    start: number;
    end: number;
    proficiency: number;
}[]): number | null;
export declare function shouldHideTranslation(limit: TranslationLimit, unknownWords: number | null): boolean;
