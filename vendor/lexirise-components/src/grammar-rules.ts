export type GrammarRule = {
  slug: string; title: string; subtitle: string; level: string;
  proficiency: number; localOverride: boolean;
  spans: { start: number; end: number }[]; examples: string[];
};

export function appliesToWord(rule: GrammarRule, start: number, end: number): boolean {
  return rule.spans.some(span => span.start < end && span.end > start);
}

export function unknownWordGrammar(rules: GrammarRule[], start: number, end: number): GrammarRule[] {
  return rules.filter(rule => rule.proficiency < 4 && appliesToWord(rule, start, end));
}

export function grammarUrl(slug: string, language = 'zh'): string {
  return `https://lexirise.app/learn/${encodeURIComponent(language)}/grammar/${encodeURIComponent(slug)}`;
}
