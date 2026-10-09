export type GrammarRule = {
    slug: string;
    title: string;
    subtitle: string;
    level: string;
    proficiency: number;
    localOverride: boolean;
    spans: {
        start: number;
        end: number;
    }[];
    examples: string[];
};
export declare function appliesToWord(rule: GrammarRule, start: number, end: number): boolean;
export declare function unknownWordGrammar(rules: GrammarRule[], start: number, end: number): GrammarRule[];
export declare function grammarUrl(slug: string, language?: string): string;
