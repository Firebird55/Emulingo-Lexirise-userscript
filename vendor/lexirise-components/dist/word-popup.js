export const WORD_POPUP_TABS = ['definition', 'translation', 'context', 'components', 'examples', 'similar', 'words', 'notes', 'grammar'];
export const WORD_POPUP_SECTIONS = ['senses', 'breakdown', 'dictionaries', 'frequency'];
// Reviewed against Lexirise's public settings/lookup modules, 2026-10-11.
// Definition stays enabled; missing items retain the website's defaults.
export function normalizeWordPopupSettings(value) {
    const settings = value && typeof value === 'object' ? value : {};
    function items(value, ids, locked) {
        const result = [];
        for (const item of Array.isArray(value) ? value : []) {
            const id = typeof item === 'string' ? item : item?.id;
            if (!ids.includes(id) || result.some(v => v.id === id))
                continue;
            result.push({ id, enabled: id === locked || item?.enabled !== false });
        }
        for (const id of ids)
            if (!result.some(v => v.id === id))
                result.push({ id, enabled: true });
        return result;
    }
    return { tabs: items(settings.tabs, WORD_POPUP_TABS, 'definition'), definition: items(settings.definition, WORD_POPUP_SECTIONS), openOn: settings.openOn === 'last' ? 'last' : 'first' };
}
export function validateWordPopupPatch(value) {
    if (value === null)
        return;
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('wordPopup must be an object or null.');
    const popup = value;
    for (const key of Object.keys(popup))
        if (!['tabs', 'definition', 'openOn'].includes(key))
            throw new Error(`Unknown wordPopup field: ${key}.`);
    for (const [key, ids] of [['tabs', WORD_POPUP_TABS], ['definition', WORD_POPUP_SECTIONS]]) {
        if (!(key in popup))
            continue;
        if (!Array.isArray(popup[key]))
            throw new Error(`wordPopup.${key} must be an ordered list.`);
        const seen = new Set();
        for (const item of popup[key]) {
            if (!item || typeof item !== 'object' || !ids.includes(item.id) || typeof item.enabled !== 'boolean' || Object.keys(item).some(k => !['id', 'enabled'].includes(k)))
                throw new Error(`Invalid wordPopup.${key} item. Accepted ids: ${ids.join(', ')}.`);
            if (seen.has(item.id))
                throw new Error(`Duplicate wordPopup.${key} id: ${item.id}.`);
            seen.add(item.id);
        }
    }
    if ('openOn' in popup && !['first', 'last'].includes(popup.openOn))
        throw new Error('wordPopup.openOn must be first or last.');
}
export function orderWordPopupTabs(settings, available) {
    return settings.tabs.filter(item => available.includes(item.id) && item.enabled).map(item => item.id);
}
export function orderWordPopupDefinitionSections(settings, available) {
    const sections = settings.definition.filter(item => available.includes(item.id));
    const enabled = sections.filter(item => item.enabled);
    if (!enabled.length)
        return sections.map(item => item.id);
    return sections.filter(item => item.enabled || (!enabled.some(v => ['senses', 'dictionaries'].includes(v.id)) && ['senses', 'dictionaries'].includes(item.id))).map(item => item.id);
}
export function resolveInitialWordPopupTab(tabs, settings, last) {
    return settings.openOn === 'last' && last && tabs.includes(last) ? last : tabs[0] ?? null;
}
export function popupPreferences(account, language) {
    return { layout: normalizeWordPopupSettings(account?.languageSettings[language]?.wordPopup), disabled: account?.global.disableWordPopups === true,
        hover: account?.global.wordPopupOpenMode === 'hover' };
}
