import { get } from 'svelte/store';
import { settings } from '../stores/appStore';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function sendMessage(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const appSettings = get(settings);
    const { baseUrl, apiKey, model, temperature, maxTokens } = appSettings.llm;

    const requestPayload = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
    };

    console.log('[LLM Service] Request URL:', `${baseUrl}/chat/completions`);
    console.log('[LLM Service] Request Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.substring(0, 10)}...`,
    });
    console.log('[LLM Service] Request Payload:', JSON.stringify(requestPayload, null, 2));

    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestPayload),
        });

        console.log('[LLM Service] Response Status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[LLM Service] Error Response Body:', errorText);

            let error;
            try {
                error = JSON.parse(errorText);
            } catch {
                error = { error: { message: errorText || response.statusText } };
            }

            throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;
                            onChunk(content);
                        }
                    } catch (e) {
                        console.error('Error parsing stream chunk', e);
                    }
                }
            }
        }

        return fullContent;
    } catch (error) {
        console.error('LLM Service Error:', error);
        throw error;
    }
}

export const llmService = {
    sendMessage
};
