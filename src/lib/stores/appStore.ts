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

// Load settings from localStorage or use defaults
const savedSettingsStr = localStorage.getItem('appSettings');
const initialSettings: AppSettings = savedSettingsStr
    ? {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(savedSettingsStr),
        // Deep merge nested objects
        drawio: { ...DEFAULT_SETTINGS.drawio, ...(JSON.parse(savedSettingsStr).drawio || {}) },
        preferences: { ...DEFAULT_SETTINGS.preferences, ...(JSON.parse(savedSettingsStr).preferences || {}) },
    }
    : DEFAULT_SETTINGS;

export const settings = writable<AppSettings>(initialSettings);

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
export const chatInput = writable<string>("");

export const isChatOpen = writable<boolean>(true);
export const isEditorFocused = writable(false);
export const focusRestoreTrigger = writable(0);
