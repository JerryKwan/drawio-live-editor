export const SYSTEM_PROVIDER_DEFAULTS = {
    baseUrl: '/llm/', // System managed
    apiKey: '', // System managed
    model: '', // System managed
    systemPrompt: 'You are an expert Draw.io diagram assistant. You have access to the current XML of the diagram. When asked to modify the diagram, provide the full updated XML in a code block. When asked to explain, reference specific cell IDs or values.',
    temperature: 0.7,
    maxTokens: 16000,
};

export const OPENAI_COMPATIBLE_PROVIDER_DEFAULTS = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    systemPrompt: 'You are an expert Draw.io diagram assistant. You have access to the current XML of the diagram. When asked to modify the diagram, provide the full updated XML in a code block. When asked to explain, reference specific cell IDs or values.',
    temperature: 0.7,
    maxTokens: 16000,
};

export const DRAWIO_DEFAULTS = {
    baseUrl: '/drawio/', // System managed
};

export const DEFAULT_PROFILE = {
    id: 'default',
    name: 'Default Profile',
    provider: 'openai-compatible' as const,
    ...OPENAI_COMPATIBLE_PROVIDER_DEFAULTS,
};

export const DEFAULT_SETTINGS = {
    activeProfileId: 'default',
    llmProfiles: [DEFAULT_PROFILE],
    drawio: {
        ...DRAWIO_DEFAULTS,
    },
    preferences: {
        autoApplyDrawioSnippets: false,
    },
};
