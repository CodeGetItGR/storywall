import { endpoints } from '@/lib/api/endpoints';
import type { ErrorEventSource, ErrorEventStatusClass } from '@/lib/api/types';

// Admin reads for beta feedback (beta-feedback-fe-integration.md §9).

export const ADMIN_BETA_FEEDBACK_PAGE_SIZE = 50;

export const ERROR_EVENT_SOURCES: readonly ErrorEventSource[] = ['BACKEND', 'BACKGROUND', 'CLIENT'];

export const ERROR_EVENT_STATUS_CLASSES: readonly ErrorEventStatusClass[] = ['CLIENT_ERROR', 'SERVER_ERROR'];

// 4xx is a rejected request, 5xx a server failure.
export function errorStatusTone(status: number): 'warn' | 'danger' {
    return status >= 500 ? 'danger' : 'warn';
}

const ERROR_REF_PATTERN = /^[0-9a-f]{12}$/;

// A malformed ref is a 400, so only a full 12-hex ref is sent as a filter.
export function isErrorRef(value: string | null | undefined): value is string {
    return typeof value === 'string' && ERROR_REF_PATTERN.test(value);
}

export function adminBugReportsPath(page: number, size = ADMIN_BETA_FEEDBACK_PAGE_SIZE): string {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return `${endpoints.betaFeedback.bugReports}?${params.toString()}`;
}

export function adminErrorEventsPath({
    page,
    size = ADMIN_BETA_FEEDBACK_PAGE_SIZE,
    source,
    statusClass,
    ref,
}: {
    page: number;
    size?: number;
    source: ErrorEventSource | null;
    statusClass: ErrorEventStatusClass | null;
    ref: string;
}): string {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (source) params.set('source', source);
    if (statusClass) params.set('statusClass', statusClass);
    const trimmedRef = ref.trim().toLowerCase();
    if (isErrorRef(trimmedRef)) params.set('ref', trimmedRef);
    return `${endpoints.betaFeedback.errorEvents}?${params.toString()}`;
}

export interface StoredRecentError {
    method: string | null;
    path: string | null;
    status: number | null;
    errorCode: number | null;
    errorRef: string | null;
    at: string | null;
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
}

function asNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Stored entries arrive as loose records; read each field defensively.
export function toStoredRecentErrors(entries: Record<string, unknown>[] | null | undefined): StoredRecentError[] {
    return (entries ?? []).map((entry) => {
        const ref = asString(entry.errorRef);
        return {
            method: asString(entry.method),
            path: asString(entry.path),
            status: asNumber(entry.status),
            errorCode: asNumber(entry.errorCode),
            errorRef: isErrorRef(ref) ? ref : null,
            at: asString(entry.at),
        };
    });
}

// "https://app.example/q/:token" → "/q/:token", so tables show the page, not the origin.
export function pagePathOf(pageUrl: string | null | undefined): string | null {
    if (!pageUrl) return null;
    try {
        return new URL(pageUrl).pathname || '/';
    } catch {
        return pageUrl;
    }
}

export function firstLine(text: string | null | undefined): string {
    return (text ?? '').split('\n', 1)[0].trim();
}
