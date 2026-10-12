import type { StudyLanguage } from './capabilities.js';
/** Browser host adapter: account responses and credentials are never persisted.
 * Create a new session after unlocking; dispose before clearing the host key.
 * The transport owns authorization, its allowlist and cancellation. */
export declare function createReadingSession(host: {
    sourceLanguage?: StudyLanguage;
    translationLanguage?: string;
    request: (path: string, method: string, payload: unknown, signal: AbortSignal) => Promise<{
        status: number;
        responseText?: string;
        response?: unknown;
    }>;
}): {
    dispose(): void;
    initializeClient: () => Promise<void>;
    hasKey: () => boolean;
    configureKey: (key: string) => Promise<void>;
    testConnection: () => Promise<{
        connected: boolean;
        message: string;
    }>;
    requestAccount: (method: string, path: string, payload?: unknown) => Promise<Record<string, any>>;
    requestReading: (text: string, action: string, params?: {
        start?: number;
        index?: number;
    }, init?: RequestInit) => Promise<Response>;
    analyze: (text: string) => Promise<import("./reader.js").Reading>;
    normalizeReading: (text: string, result: Record<string, any>) => import("./reader.js").Reading;
    normalizeGrammar: (text: string, analysis: Record<string, any>, overrides?: Record<string, number>) => import("./grammar-rules.js").GrammarRule[];
    normalizeLookup: (raw: Record<string, any>) => import("./reader.js").Lookup;
    loadSettings: () => Promise<import("./account.js").AccountSettings>;
    patchSettings: (changes: Record<string, unknown>) => Promise<import("./account.js").AccountSettings>;
    getSettings: () => import("./account.js").AccountSettings | null;
    clearSession: () => void;
};
