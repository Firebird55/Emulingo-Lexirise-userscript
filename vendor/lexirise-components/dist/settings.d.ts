import { type ReactNode } from 'react';
import { type StudyLanguage } from './capabilities.js';
import { type SettingsAdapter } from './account.js';
import { type ReadingOptions } from './reader.js';
export type LocalSettings = ReadingOptions & {
    fontSize?: number;
    sourceLanguage?: StudyLanguage | 'auto';
    translationLanguage?: string;
};
export declare function restoreLocalSettings(value: unknown): LocalSettings;
export declare function SettingsPanel({ initial, onChange, onClose, adapter, connection, sourceLanguage, sourceOverride }: {
    initial: LocalSettings;
    onChange: (settings: LocalSettings) => void | Promise<void>;
    onClose: () => void;
    adapter: SettingsAdapter;
    connection?: ReactNode;
    sourceLanguage?: StudyLanguage;
    sourceOverride?: boolean;
}): import("react/jsx-runtime").JSX.Element;
