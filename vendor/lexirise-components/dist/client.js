import { wordZhuyin } from './zhuyin.js';
import { isStudyLanguage } from './capabilities.js';
import { validateAccount } from './account.js';
export function createLexiriseClient(host) {
    const { getValue, setValue, deleteValue } = host;
    const sourceLanguage = host.sourceLanguage ?? 'zh', translationLanguage = host.translationLanguage ?? 'en';
    if (!isStudyLanguage(sourceLanguage))
        throw new Error('Unsupported source language.');
    const API = 'https://api.lexirise.app';
    const DAY = 86400000;
    const memory = new Map();
    const pending = new Map();
    const states = new Map();
    let grammarChoices = {};
    let credential = '';
    let settingsScope = 'unloaded';
    function adoptSettings(value) {
        const profile = value.languageSettings[sourceLanguage] ?? {};
        const scope = JSON.stringify([value.global.effectiveTranslationLanguage ?? value.global.translationLanguage ?? value.native_lang, profile.script, profile.readingAid]);
        if (scope !== settingsScope) {
            settingsScope = scope;
            generation++;
            memory.clear();
            pending.clear();
            missingGloss.clear();
            glossPending.clear();
            try {
                window.dispatchEvent(new Event('lexirise-account-settings'));
            }
            catch { }
        }
        return value;
    }
    let accountScope = 'unconfigured';
    async function identifyAccount(key) { accountScope = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))).map(n => n.toString(16).padStart(2, '0')).join(''); }
    let generation = 0;
    let cooldown = 0;
    let running = 0;
    let cacheWrites = Promise.resolve();
    const waiting = [];
    async function initializeClient() { const key = await getValue('lexirise:key', ''); if (key !== credential) {
        generation++;
        memory.clear();
        pending.clear();
        states.clear();
        missingGloss.clear();
        glossPending.clear();
    } credential = key; await identifyAccount(credential); grammarChoices = await getValue('lexirise:grammar:' + sourceLanguage, sourceLanguage === 'zh' ? await getValue('lexirise:grammar', {}) : {}); if (credential || host.configured?.()) {
        try {
            await loadSettings();
        }
        catch { /* A settings-read failure is surfaced in the panel; it must not disable a working reader. */ }
    } }
    function hasKey() { return Boolean(credential); }
    async function configureKey(key) {
        const next = key.trim();
        if (next)
            await setValue('lexirise:key', next);
        else
            await deleteValue('lexirise:key');
        credential = next;
        await identifyAccount(next);
        generation++;
        memory.clear();
        pending.clear();
        states.clear();
        missingGloss.clear();
        glossPending.clear();
        cooldown = 0;
        try {
            window.dispatchEvent(new Event('lexirise-credentials-changed'));
        }
        catch { }
    }
    async function api(method, path, payload) {
        if (!host.configured?.() && !credential)
            throw new Error('Add your Lexirise API key in Lexirise settings.');
        if (Date.now() < cooldown)
            throw new Error('Lexirise request limit reached. Wait a minute, then retry.');
        if (running >= 4)
            await new Promise(resolve => waiting.push(resolve));
        running++;
        const key = credential, revision = generation;
        try {
            const result = await host.request(path, method, payload);
            if (revision !== generation)
                throw new Error('API key changed. Retry the request.');
            if (result.status === 401 || result.status === 403)
                throw new Error('Lexirise rejected the key. Check your Pro account and API key.');
            if (result.status === 429) {
                cooldown = Date.now() + 60000;
                throw new Error('Lexirise request limit reached. Wait a minute, then retry.');
            }
            if (result.status < 200 || result.status >= 300)
                throw new Error(`Lexirise returned HTTP ${result.status}. Please retry.`);
            try {
                return result.responseText ? JSON.parse(result.responseText) : result.response;
            }
            catch {
                throw new Error('Lexirise returned an invalid response. Please retry.');
            }
        }
        finally {
            running--;
            waiting.shift()?.();
        }
    }
    async function testConnection() { const result = await api('GET', '/v1/me'); return { connected: Boolean(result.user), message: result.user ? 'Connected to Lexirise.' : 'No account returned.' }; }
    async function cached(kind, key, ttl, load, complete = () => true) {
        // Only dictionary data is persisted; account states/analysis stay session-local.
        const identity = `${host.cacheScope}:${accountScope}:${sourceLanguage}:${translationLanguage}:${settingsScope}:${kind}:${key}`, now = Date.now(), revision = generation;
        const hit = memory.get(identity);
        if (hit && now - hit.at < ttl)
            return hit.value;
        if (pending.has(identity))
            return pending.get(identity);
        const task = (async () => {
            if (['dictionary', 'context', 'similar'].includes(kind)) {
                const stored = await getValue('cache:' + identity, null);
                if (stored && now - stored.at < ttl && complete(stored.value)) {
                    memory.set(identity, stored);
                    return stored.value;
                }
            }
            const value = await load();
            if (revision !== generation)
                throw new Error('API key changed. Retry.');
            if (complete(value)) {
                const entry = { value, at: Date.now() };
                memory.set(identity, entry);
                if (memory.size > 500)
                    memory.delete(memory.keys().next().value);
                if (['dictionary', 'context', 'similar'].includes(kind)) {
                    const write = cacheWrites.catch(() => { }).then(async () => {
                        await setValue('cache:' + identity, entry);
                        // Serialize index updates so concurrent lookups cannot orphan entries.
                        const keys = await getValue('cache:index', []);
                        const updated = [...keys.filter(k => k !== identity), identity];
                        while (updated.length > 500)
                            await deleteValue('cache:' + updated.shift());
                        await setValue('cache:index', updated);
                    });
                    cacheWrites = write;
                    await write;
                }
            }
            return value;
        })();
        pending.set(identity, task);
        try {
            return await task;
        }
        finally {
            if (pending.get(identity) === task)
                pending.delete(identity);
        }
    }
    function textValue(value) { return typeof value === 'string' ? value : ''; }
    function list(value) { return Array.isArray(value) ? value : []; }
    function translationsFor(raw) {
        const items = list(raw?.translations);
        const preferred = items.filter(t => t?.target_lang === translationLanguage && textValue(t.translation).trim());
        return preferred.length ? preferred : items.filter(t => t?.target_lang === (raw?.translation_target || items.find(t => textValue(t?.translation).trim())?.target_lang) && textValue(t.translation).trim());
    }
    function validTone(value) { return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= (sourceLanguage === 'yue' ? 6 : 5) ? Number(value) : 0; }
    function validState(value) { return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4 ? Number(value) : 0; }
    function normalizeGrammar(text, analysis, overrides = {}) {
        const rules = new Map(), occurrences = list(analysis.occurrences);
        for (const match of list(analysis.grammar)) {
            if (!match || !(/^[a-zA-Z0-9_-]{1,160}$/.test(textValue(match.slug))))
                continue;
            const indices = [...list(match.indices), ...list(match.anchors).map(a => a?.token)];
            const spans = [];
            for (const index of indices) {
                const t = occurrences[index];
                if (!Number.isInteger(index) || !t || !validSpan(text, t.charStart, t.charEnd))
                    continue;
                if (!spans.some(s => s.start === t.charStart && s.end === t.charEnd))
                    spans.push({ start: t.charStart, end: t.charEnd });
            }
            if (!spans.length)
                continue;
            let rule = rules.get(match.slug);
            if (!rule) {
                rule = { slug: match.slug, title: textValue(match.title) || match.slug, subtitle: textValue(match.subtitle), level: textValue(match.level), proficiency: validState(overrides[match.slug] ?? analysis.grammarStates?.[match.slug]), localOverride: match.slug in overrides, spans: [], examples: [] };
                rules.set(match.slug, rule);
            }
            for (const span of spans)
                if (!rule.spans.some(s => s.start === span.start && s.end === span.end))
                    rule.spans.push(span);
            const example = text.slice(Math.min(...spans.map(s => s.start)), Math.max(...spans.map(s => s.end)));
            if (!rule.examples.includes(example))
                rule.examples.push(example);
        }
        return [...rules.values()];
    }
    function validSpan(text, start, end) {
        return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start < end && end <= text.length &&
            !(start > 0 && /[\uDC00-\uDFFF]/.test(text[start])) && !(end < text.length && /[\uDC00-\uDFFF]/.test(text[end]));
    }
    function normalizeReading(text, result) {
        let last = 0;
        const tokens = [];
        for (const item of [...list(result.occurrences)].sort((a, b) => (a?.charStart ?? 0) - (b?.charStart ?? 0))) {
            if (!item?.isWordLike || !validSpan(text, item.charStart, item.charEnd) || item.charStart < last)
                continue;
            const word = text.slice(item.charStart, item.charEnd);
            if (item.word !== word)
                continue;
            const entryId = Number.isInteger(item.entryId) ? item.entryId : null;
            const meta = result.entryMetaById?.[String(entryId)] || {}, state = result.stateByEntryId?.[String(entryId)] || {};
            const tones = list(item.tones || meta.tones).map(validTone), pinyin = textValue(item.transliteration) || textValue(meta.transliteration);
            tokens.push({ start: item.charStart, end: item.charEnd, word, entryId, proficiency: states.get(entryId)?.proficiency ?? validState(state.proficiency), pinyin, zhuyin: sourceLanguage === 'zh' ? wordZhuyin(pinyin, tones, word) : '', tones, meaning: textValue(meta.gloss), savedExpressionId: states.get(entryId)?.savedExpressionId ?? state.saved_expression_id });
            last = item.charEnd;
        }
        return { text, tokens, analysisPending: Boolean(result.morphoPending), grammar: normalizeGrammar(text, result, grammarChoices) };
    }
    const missingGloss = new Map();
    const glossPending = new Set();
    async function analyze(text) {
        if (!text.trim() || text.length > 1600)
            throw new Error('Lexirise supports sentences up to 1600 characters.');
        const result = await cached('analysis', text, 600000, () => api('POST', '/v1/analyze/text', { text, language: sourceLanguage, fast: false }), r => !r.morphoPending);
        const reading = normalizeReading(text, result);
        let pendingMeanings = false;
        for (const token of reading.tokens) {
            if (token.meaning)
                continue;
            const stored = memory.get(`${host.cacheScope}:${accountScope}:${sourceLanguage}:${translationLanguage}:${settingsScope}:dictionary:${token.word}`)?.value;
            const gloss = translationsFor(stored)[0]?.translation || missingGloss.get(token.word)?.value;
            if (gloss) {
                token.meaning = gloss;
                continue;
            }
            if (glossPending.has(token.word)) {
                pendingMeanings = true;
                continue;
            }
            if ((missingGloss.get(token.word)?.retryAt || 0) > Date.now()) {
                pendingMeanings = true;
                continue;
            }
            // Do not block the first annotated render while short glosses load.
            const revision = generation;
            glossPending.add(token.word);
            pendingMeanings = true;
            void dictionary(token.word).then(d => { if (revision === generation)
                missingGloss.set(token.word, { retryAt: Date.now() + 60000, value: translationsFor(d)[0]?.translation }); }).catch(() => { if (revision === generation)
                missingGloss.set(token.word, { retryAt: Date.now() + 60000 }); }).finally(() => glossPending.delete(token.word));
        }
        return { ...reading, pendingMeanings };
    }
    async function dictionary(word) { return cached('dictionary', word, 30 * DAY, () => api('POST', '/v1/dictionary/lookup', { text: word, language: sourceLanguage }), r => r.translation_status !== 'pending' && translationsFor(r).length > 0); }
    async function tokenAt(text, start) { const token = (await analyze(text)).tokens.find(t => t.start === start); if (!token)
        throw new Error('This word changed. Tap it again.'); return token; }
    function normalizeLookup(raw) {
        const translations = translationsFor(raw).map(t => ({ meaning: t.translation.trim(), partOfSpeech: list(t.part_of_speech).filter(p => typeof p === 'string'), examples: list(t.examples).filter(e => typeof e?.text === 'string').slice(0, 6).map(e => ({ text: e.text, translation: textValue(e.translation) })) }));
        const examples = translations.flatMap(t => t.examples).filter((e, i, a) => a.findIndex(x => x.text === e.text) === i).slice(0, 8);
        const dictionaries = list(raw.supplementalEntries).filter(Boolean).map(entry => {
            const doc = new DOMParser().parseFromString(textValue(entry.html), 'text/html');
            const headword = doc.querySelector('[data-sc-cccedict="headword"]');
            const name = headword?.textContent?.trim() || textValue(entry.headword);
            headword?.remove();
            doc.querySelectorAll('script,style,iframe').forEach(e => e.remove());
            let definitions = [...doc.querySelectorAll('li')].map(li => li.textContent?.trim() || '').filter(Boolean);
            if (!definitions.length)
                definitions = [...doc.querySelectorAll('p,div')].filter(e => !e.querySelector('p,div')).map(p => p.textContent?.trim() || '').filter(Boolean);
            if (!definitions.length && doc.body.textContent?.trim())
                definitions = [doc.body.textContent.trim()];
            return { name: textValue(entry.dictionary_name) || 'Dictionary', headword: name, reading: textValue(entry.reading), definitions: [...new Set(definitions)] };
        });
        const info = raw.characterInfo || {};
        const tag = list(raw.system_tags).find(t => typeof t === 'string' && /^HSK-\d+$/.test(t));
        return { sourceLanguage, translationLanguage: translationsFor(raw)[0]?.target_lang ?? translationLanguage, translations, examples, dictionaries, hskLevel: info.statistics?.hskLevel || (tag ? Number(tag.slice(4)) : undefined), rank: raw.rank, frequencyScore: raw.frequency_score, alternateReadings: list(raw.multipleReadings?.alternatives), components: components(info), characterHint: textValue(info.hint), strokeCount: info.strokeCount, character: textValue(info.char) };
    }
    function components(info) { return list(info.components).filter(Boolean).map(part => ({ character: textValue(part.character), type: list(part.type).filter(t => typeof t === 'string'), hint: textValue(part.hint) })); }
    async function lookup(text, start) { const token = await tokenAt(text, start); return normalizeLookup(await dictionary(token.word)); }
    async function characters(text, start) {
        const token = await tokenAt(text, start);
        const letters = [...new Set([...token.word].filter(c => /\p{Script=Han}/u.test(c)))].slice(0, 8);
        let partial = false;
        const details = await Promise.all(letters.map(async (character) => { try {
            const raw = await dictionary(character), info = raw.characterInfo || {};
            return { character, hint: textValue(info.hint), strokeCount: info.strokeCount, pinyin: list(info.pinyin), gloss: textValue(info.gloss), components: components(info), unavailable: false };
        }
        catch {
            partial = true;
            return { character, hint: '', pinyin: [], gloss: '', components: [], unavailable: true };
        } }));
        const parts = [...new Set(details.flatMap(c => c.components.map(p => p.character)).filter(c => [...c].length === 1 && /\p{Script=Han}/u.test(c)))];
        const enriched = new Map();
        await Promise.all(parts.map(async (c) => { try {
            enriched.set(c, (await dictionary(c)).characterInfo || {});
        }
        catch {
            partial = true;
        } }));
        return { characters: details.map(c => ({ ...c, components: c.components.map(p => ({ ...p, pinyin: list(enriched.get(p.character)?.pinyin), gloss: textValue(enriched.get(p.character)?.gloss), characterHint: textValue(enriched.get(p.character)?.hint) })) })), partial };
    }
    async function context(text, start, question) {
        const token = await tokenAt(text, start);
        return cached('context', JSON.stringify([text, start, question || '']), 30 * DAY, () => api('POST', '/v1/analyze/context', { text, language: sourceLanguage, charStart: token.start, charEnd: token.end, ...(question ? { question } : {}) }));
    }
    async function similar(text, start) {
        return cached('similar', JSON.stringify([text, start]), 7 * DAY, async () => {
            const token = await tokenAt(text, start);
            const answer = await context(text, start, `Suggest exactly three close ${sourceLanguage} alternatives to ${token.word} in this context. For each, give the source-language word, short ${translationLanguage} meaning, and one short usage distinction. Use one line per alternative, formatted WORD | MEANING | USAGE. No introduction or markdown.`);
            const suggestions = [];
            for (const line of textValue(answer.meaning).split('\n')) {
                const match = line.trim().replace(/^[-•\s]+/, '').match(/^(?:\*\*)?([^|\n]{1,80}?)(?:\*\*)?\s*(?:\||[—–-])\s*(.+)/);
                if (!match || match[1] === token.word || suggestions.some(s => s.word === match[1]))
                    continue;
                try {
                    const raw = await dictionary(match[1]);
                    if (raw.word !== match[1] || !raw.entry_id)
                        continue;
                    const [meaning, usage = ''] = match[2].split('|').map(x => x.trim());
                    suggestions.push({ word: raw.word, meaning: translationsFor(raw)[0]?.translation || meaning, usage, pinyin: textValue(raw.transliteration), tones: list(raw.tones).map(validTone) });
                }
                catch { /* An unverified suggestion is never displayed. */ }
                if (suggestions.length === 4)
                    break;
            }
            return { suggestions, generated: true };
        }, r => Boolean(r.suggestions.length));
    }
    async function proficiency(text, start, level) {
        if (![1, 2, 3, 4].includes(level))
            throw new Error('Invalid vocabulary status.');
        const token = await tokenAt(text, start);
        if (token.entryId == null)
            throw new Error('Lexirise did not return a dictionary entry for this word.');
        const saved = states.get(token.entryId)?.savedExpressionId || token.savedExpressionId;
        const raw = saved ? await api('PATCH', `/v1/vocabulary/${saved}`, { proficiency: level }) : await api('POST', '/v1/vocabulary', { language: sourceLanguage, text: token.word, mode: 'word', proficiency: level });
        const item = raw.item || raw;
        const savedId = item.saved_expression_id || item.id;
        if (!Number.isInteger(savedId) || savedId <= 0 || item.proficiency !== level)
            throw new Error('Lexirise did not confirm the saved word status. Retry to check it.');
        states.set(token.entryId, { proficiency: level, savedExpressionId: savedId });
        return { word: token.word, entryId: token.entryId, proficiency: level, savedExpressionId: savedId };
    }
    async function requestReading(text, action, params = {}, init = {}) {
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
        const start = params.start ?? body.start;
        let result;
        switch (action) {
            case 'analysis':
                result = await analyze(text);
                break;
            case 'lookup':
                result = await lookup(text, start);
                break;
            case 'characters':
                result = await characters(text, start);
                break;
            case 'context':
                result = await context(text, start, body.question);
                break;
            case 'examples': {
                const details = await lookup(text, start);
                result = { examples: await Promise.all(details.examples.slice(0, 5).map(async (e) => ({ ...e, tokens: await analyze(e.text).then(r => r.tokens).catch(() => []) }))) };
                break;
            }
            case 'similar':
                result = await similar(text, start);
                break;
            case 'proficiency':
                result = await proficiency(text, start, body.proficiency);
                break;
            case 'grammar': {
                const rule = (await analyze(text)).grammar?.find(g => g.slug === body.slug);
                if (!rule)
                    throw new Error('Grammar rule no longer available.');
                const updated = { ...grammarChoices, [rule.slug]: body.known ? 4 : 0 };
                await setValue('lexirise:grammar:' + sourceLanguage, updated);
                grammarChoices = updated;
                result = { slug: rule.slug, proficiency: grammarChoices[rule.slug], localOverride: true };
                break;
            }
            case 'save-example': {
                const example = (await lookup(text, start)).examples[params.index];
                if (!example)
                    throw new Error('Example no longer available.');
                const raw = await api('POST', '/v1/vocabulary', { language: sourceLanguage, text: example.text, mode: 'sentence', translation: example.translation });
                const saved = (raw.item || raw).id || (raw.item || raw).saved_expression_id;
                if (!Number.isInteger(saved) || saved <= 0)
                    throw new Error('Lexirise did not confirm the bookmark. Retry to check it.');
                result = { saved: true, savedExpressionId: saved };
                break;
            }
            default: throw new Error('Unknown reading action.');
        }
        if (init.signal?.aborted)
            throw new DOMException('Aborted', 'AbortError');
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    async function loadSettings() { return adoptSettings(validateAccount(await api('GET', '/v1/settings'))); }
    async function patchSettings(changes) { return adoptSettings(validateAccount(await api('PATCH', '/v1/settings', changes))); }
    return { initializeClient, hasKey, configureKey, testConnection, requestReading, analyze, normalizeReading, normalizeGrammar, normalizeLookup, loadSettings, patchSettings };
}
