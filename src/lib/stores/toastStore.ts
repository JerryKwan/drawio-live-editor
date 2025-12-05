import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    return {
        subscribe,
        add: (message: string, type: ToastType = 'info', duration = 3000) => {
            const id = crypto.randomUUID();
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
