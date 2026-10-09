import type { Reading, Lookup } from './reader.js';
import type { GrammarRule } from './grammar-rules.js';
import { type StudyLanguage } from './capabilities.js';
import { type AccountSettings } from './account.js';
export type ClientHost = {
    getValue: <T>(key: string, fallback: T) => Promise<T>;
    setValue: (key: string, value: unknown) => Promise<void>;
    deleteValue: (key: string) => Promise<void>;
    request: (path: string, method: string, payload?: unknown) => Promise<{
        status: number;
        responseText?: string;
        response?: unknown;
    }>;
    configured?: () => boolean;
    sourceLanguage?: StudyLanguage;
    translationLanguage?: string;
    cacheScope: string;
};
export declare function createLexiriseClient(host: ClientHost): {
    initializeClient: () => Promise<void>;
    hasKey: () => boolean;
    configureKey: (key: string) => Promise<void>;
    testConnection: () => Promise<{
        connected: boolean;
        message: string;
    }>;
    requestReading: (text: string, action: string, params?: {
        start?: number;
        index?: number;
    }, init?: RequestInit) => Promise<Response>;
    analyze: (text: string) => Promise<Reading>;
    normalizeReading: (text: string, result: Record<string, any>) => Reading;
    normalizeGrammar: (text: string, analysis: Record<string, any>, overrides?: Record<string, number>) => GrammarRule[];
    normalizeLookup: (raw: Record<string, any>) => Lookup;
    loadSettings: () => Promise<AccountSettings>;
    patchSettings: (changes: Record<string, unknown>) => Promise<AccountSettings>;
};
