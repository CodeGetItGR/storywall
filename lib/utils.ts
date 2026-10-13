import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const IDLE_FALLBACK_DELAY_MS = 200;

// Runs the callback once the browser is idle, or after timeoutMs at the latest. Safari has no
// requestIdleCallback, so there it runs after a short delay. Returns a function that cancels it.
export function runWhenIdle(callback: () => void, timeoutMs: number): () => void {
    if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(callback, { timeout: timeoutMs });
        return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(callback, Math.min(IDLE_FALLBACK_DELAY_MS, timeoutMs));
    return () => window.clearTimeout(handle);
}

export function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#ff7a59', '#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#6366f1'];

// Deterministic so the same member always gets the same fallback color,
// without the backend needing to store one.
export function avatarColorFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function timeAgoParts(dateStr: string): {
    unit: 'now' | 'minutes' | 'hours' | 'days';
    value: number;
} {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return { unit: 'now', value: 0 };
    if (diff < 3600) return { unit: 'minutes', value: Math.floor(diff / 60) };
    if (diff < 86400) return { unit: 'hours', value: Math.floor(diff / 3600) };
    return { unit: 'days', value: Math.floor(diff / 86400) };
}
