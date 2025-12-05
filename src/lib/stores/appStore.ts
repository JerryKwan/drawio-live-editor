import { writable } from 'svelte/store';

// Default Draw.io XML template
const DEFAULT_XML = `<mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
  <root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
  </root>
</mxGraphModel>`;

// Store for the current Draw.io XML content
export const currentXml = writable<string>(DEFAULT_XML);

// Store for application settings
export interface AppSettings {
    llm: {
        baseUrl: string;
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        systemPrompt: string;
    };
    drawio: {
        baseUrl: string;
    };
}

const DEFAULT_SETTINGS: AppSettings = {
    llm: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are an expert Draw.io diagram assistant. You have access to the current XML of the diagram. When asked to modify the diagram, provide the full updated XML in a code block. When asked to explain, reference specific cell IDs or values.',
    },
    drawio: {
        baseUrl: 'https://embed.diagrams.net',
    },
};

// Load settings from localStorage if available
const savedSettings = localStorage.getItem('appSettings');
export const settings = writable<AppSettings>(
    savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS
);

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
