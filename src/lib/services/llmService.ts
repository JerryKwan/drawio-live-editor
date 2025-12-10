import { get } from 'svelte/store';
import { settings } from '../stores/appStore';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export async function sendMessage(messages: ChatMessage[], onChunk: (chunk: string) => void, xmlContext?: string, signal?: AbortSignal): Promise<string> {
    const appSettings = get(settings);
    const activeProfile = appSettings.llmProfiles.find(p => p.id === appSettings.activeProfileId);

    if (!activeProfile) {
        throw new Error('No active LLM profile found');
    }

    const { baseUrl, apiKey, model, temperature, maxTokens, systemPrompt } = activeProfile;

    // Construct valid system message
    let finalSystemInfo = systemPrompt;
    if (xmlContext) {
        finalSystemInfo += `\n\Here is the current diagram XML:\n\`\`\`xml\n${xmlContext}\n\`\`\``;
    }

    const systemMessage: ChatMessage = {
        role: 'system',
        content: finalSystemInfo
    };

    // Prepare full message list with system prompt at the start
    const finalMessages = [systemMessage, ...messages];

    const requestPayload = {
        model,
        messages: finalMessages,
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
            signal,
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

        console.log('[LLM Service] Stream started');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let streamFinished = false;

        while (true) {
            let done, value;
            try {
                ({ done, value } = await reader.read());
            } catch (readError) {
                console.error('[LLM Service] Stream reading error (Network interrupted?):', readError);
                throw readError;
            }

            if (done) {
                if (!streamFinished) {
                    console.warn('[LLM Service] Stream ended without explicit finish_reason or [DONE] signal. (Possible interruption)');
                } else {
                    console.log('[LLM Service] Stream completed successfully');
                }
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        streamFinished = true;
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices[0]?.delta;
                        const finishReason = parsed.choices[0]?.finish_reason;

                        if (finishReason) {
                            console.log(`[LLM Service] Stream finished with reason: ${finishReason}`);
                            streamFinished = true;
                            if (finishReason === 'length') {
                                console.warn('[LLM Service] Warning: Output truncated due to max_tokens limit.');
                            } else if (finishReason !== 'stop') {
                                console.warn(`[LLM Service] Warning: Finish reason is ${finishReason}`);
                            }
                        }

                        const content = delta?.content || '';
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
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('[LLM Service] Request aborted by user');
            throw new Error('Request cancelled by user');
        }
        console.error('LLM Service Error:', error);
        throw error;
    }
}

export async function testConnection(profile: { baseUrl: string; apiKey: string; model: string }): Promise<boolean> {
    try {
        const { baseUrl, apiKey, model } = profile;
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[LLM Test] Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('[LLM Test] Connection failed:', error);
        throw error;
    }
}

export const llmService = {
    sendMessage,
    testConnection
};
