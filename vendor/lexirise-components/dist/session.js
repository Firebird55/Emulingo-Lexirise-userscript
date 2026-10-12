import { createLexiriseClient } from './client.js';
/** Browser host adapter: account responses and credentials are never persisted.
 * Create a new session after unlocking; dispose before clearing the host key.
 * The transport owns authorization, its allowlist and cancellation. */
export function createReadingSession(host) {
    let closed = false;
    const abort = new AbortController(), memory = new Map();
    const client = createLexiriseClient({
        sourceLanguage: host.sourceLanguage, translationLanguage: host.translationLanguage, cacheScope: 'browser-session',
        configured: () => !closed,
        getValue: async (key, fallback) => memory.get(key) ?? fallback,
        setValue: async (key, value) => { if (closed)
            throw Error('Lexirise is locked.'); if (key === 'lexirise:key')
            throw Error('The host vault owns credentials.'); memory.set(key, value); },
        deleteValue: async (key) => { memory.delete(key); },
        request: async (path, method, payload) => { if (closed)
            throw Error('Lexirise is locked.'); const result = await host.request(path, method, payload, abort.signal); if (closed)
            throw Error('Lexirise is locked.'); return result; }
    });
    return { ...client, dispose() { if (closed)
            return; closed = true; abort.abort(); memory.clear(); client.clearSession(); } };
}
