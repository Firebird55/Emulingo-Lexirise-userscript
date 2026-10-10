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
export type ReadingOptionsControlsProps = {
    value: LocalSettings;
    onChange: (settings: LocalSettings) => void;
    sourceLanguage?: StudyLanguage;
    sourceOverride?: boolean;
};
/** Immediate local preferences; no transport, key storage, or account writes. */
export declare function ReadingOptionsControls({ value: local, onChange: updateLocal, sourceLanguage, sourceOverride }: ReadingOptionsControlsProps): import("react/jsx-runtime").JSX.Element;
export declare function ReadingOptionsDialog({ initial, onChange, onClose, sourceLanguage }: {
    initial: LocalSettings;
    onChange: (settings: LocalSettings) => void | Promise<void>;
    onClose: () => void;
    sourceLanguage?: StudyLanguage;
}): import("react/jsx-runtime").JSX.Element;
export declare function SettingsPanel({ initial, onChange, onClose, adapter, connection, sourceLanguage, sourceOverride, showReadingOptions, title }: {
    initial: LocalSettings;
    onChange: (settings: LocalSettings) => void | Promise<void>;
    onClose: () => void;
    adapter: SettingsAdapter;
    connection?: ReactNode;
    sourceLanguage?: StudyLanguage;
    sourceOverride?: boolean;
    showReadingOptions?: boolean;
    title?: string;
}): import("react/jsx-runtime").JSX.Element;
