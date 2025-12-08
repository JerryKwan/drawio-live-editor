import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

// Fallback for browsers that don't support crypto.randomUUID (non-secure contexts)
function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback: simple random ID generator
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    return {
        subscribe,
        add: (message: string, type: ToastType = 'info', duration = 3000) => {
            const id = generateId();
            update((toasts) => [...toasts, { id, message, type, duration }]);
            setTimeout(() => {
                update((toasts) => toasts.filter((t) => t.id !== id));
            }, duration);
        },
        remove: (id: string) => {
            update((toasts) => toasts.filter((t) => t.id !== id));
        }
    };
}

export const toastStore = createToastStore();
