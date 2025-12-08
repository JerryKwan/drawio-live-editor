import { writable } from 'svelte/store';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../config';

// Default Draw.io XML template
import DEFAULT_XML from '../../assets/default-graph.xml?raw';

// Store for the current Draw.io XML content
export const currentXml = writable<string>(DEFAULT_XML);

// Store for application settings
export interface LLMProfile {
    id: string;
    name: string;
    provider: 'system' | 'openai-compatible';
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
}

export interface AppSettings {
    activeProfileId: string;
    llmProfiles: LLMProfile[];
    drawio: {
        baseUrl: string;
    };
    preferences: {
        autoApplyDrawioSnippets: boolean;
    };
}

// Load settings from localStorage if available
const savedSettingsStr = localStorage.getItem('appSettings');
let savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : {};

// Migration: If old settings format (has 'llm' object but no 'llmProfiles'), convert to profile
if (savedSettings.llm && !savedSettings.llmProfiles) {
    const migratedProfile: LLMProfile = {
        ...DEFAULT_PROFILE,
        ...savedSettings.llm,
        id: 'default',
        name: 'Default Profile',
        provider: 'openai-compatible'
    };
    savedSettings = {
        ...savedSettings,
        activeProfileId: 'default',
        llmProfiles: [migratedProfile]
    };
    delete savedSettings.llm; // Remove old key
}

// Migration: Convert legacy 'openai' provider to 'openai-compatible'
if (savedSettings.llmProfiles) {
    savedSettings.llmProfiles = savedSettings.llmProfiles.map((p: any) => {
        if (p.provider === 'openai') {
            return { ...p, provider: 'openai-compatible' };
        }
        return p;
    });
}

const mergedSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    // Deep merge for specific objects if needed, but for arrays like llmProfiles we generally prefer saved ones or defaults
    // However, if we migrated above, savedSettings now has the correct structure
    drawio: { ...DEFAULT_SETTINGS.drawio, ...savedSettings.drawio },
    preferences: { ...DEFAULT_SETTINGS.preferences, ...savedSettings.preferences },
};

export const settings = writable<AppSettings>(mergedSettings);

// Subscribe to settings changes to save to localStorage
settings.subscribe((value) => {
    localStorage.setItem('appSettings', JSON.stringify(value));
});

// Chat history store
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export const chatHistory = writable<ChatMessage[]>([]);

export const isChatOpen = writable<boolean>(true);
export const isEditorFocused = writable(false);
export const focusRestoreTrigger = writable(0);
