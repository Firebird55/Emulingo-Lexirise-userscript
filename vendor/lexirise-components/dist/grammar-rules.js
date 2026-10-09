export function appliesToWord(rule, start, end) {
    return rule.spans.some(span => span.start < end && span.end > start);
}
export function unknownWordGrammar(rules, start, end) {
    return rules.filter(rule => rule.proficiency < 4 && appliesToWord(rule, start, end));
}
export function grammarUrl(slug, language = 'zh') {
    return `https://lexirise.app/learn/${encodeURIComponent(language)}/grammar/${encodeURIComponent(slug)}`;
}
