export function restoreTranslationLimit(value) {
    return value === 0 || value === 1 || value === 2 || value === 3 ? value : 'off';
}
// Count word occurrences, using the same Known (4) boundary as reading annotations.
// Incomplete analysis must never be mistaken for knowing every word.
export function countUnknownWords(text, tokens) {
    const han = /\p{L}/u;
    if (!han.test(text))
        return null;
    let cursor = 0;
    let count = 0;
    for (const token of tokens) {
        if (token.start < cursor || token.end <= token.start || token.end > text.length)
            return null;
        if (han.test(text.slice(cursor, token.start)))
            return null;
        if (han.test(text.slice(token.start, token.end)) && token.proficiency !== 4)
            count++;
        cursor = token.end;
    }
    return han.test(text.slice(cursor)) ? null : count;
}
export function shouldHideTranslation(limit, unknownWords) {
    return limit !== 'off' && unknownWords !== null && unknownWords <= limit;
}
