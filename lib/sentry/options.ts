import type { Breadcrumb, ErrorEvent, Event, EventHint } from '@sentry/nextjs';

import { scrubUrl } from '@/lib/sentry/scrubUrl';

// Options shared by the browser, Node and edge Sentry clients. No DSN (local
// dev, tests, previews without the env var) leaves Sentry switched off.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// URLs and "METHOD url" span names: scrub each word that is a URL or a path.
function scrubText(text: string): string {
    return text
        .split(' ')
        .map((word) => (/^(https?:\/\/|\/)/.test(word) ? scrubUrl(word) : word))
        .join(' ');
}

const URL_KEYS = ['url', 'from', 'to', 'http.url', 'url.full'];

function scrubData(data: Record<string, unknown> | undefined): void {
    if (!data) return;
    for (const key of URL_KEYS) {
        const value = data[key];
        if (typeof value === 'string') data[key] = scrubText(value);
    }
    delete data['http.query'];
    delete data['url.query'];
    delete data['http.fragment'];
}

function scrubEvent<T extends Event>(event: T): T {
    if (event.request) {
        if (event.request.url) event.request.url = scrubUrl(event.request.url);
        delete event.request.query_string;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.data;
    }
    if (event.transaction) event.transaction = scrubText(event.transaction);
    for (const breadcrumb of event.breadcrumbs ?? []) scrubBreadcrumb(breadcrumb);
    return event;
}

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
    scrubData(breadcrumb.data);
    if (breadcrumb.message) breadcrumb.message = scrubText(breadcrumb.message);
    return breadcrumb;
}

type RecordingEvent = { type: number; data: unknown };

// A replay recording keeps the page URL (its meta event's href) and the URLs of
// its navigation and fetch spans; beforeSend never sees either.
export function scrubRecordingEvent<T extends RecordingEvent>(event: T): T {
    const data = event.data as { href?: unknown; payload?: { description?: unknown; data?: Record<string, unknown> } };
    if (typeof data?.href === 'string') data.href = scrubUrl(data.href);
    const payload = data?.payload;
    if (payload) {
        if (typeof payload.description === 'string') payload.description = scrubText(payload.description);
        scrubData(payload.data);
    }
    return event;
}

// The backend reports its own failures; a 4xx is an expected answer, not a bug.
function isExpectedApiError(hint: EventHint): boolean {
    const error = hint.originalException as { name?: unknown; status?: unknown } | null | undefined;
    return error?.name === 'ApiError' && typeof error.status === 'number' && error.status < 500;
}

export const sentrySharedOptions = {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
    },
    beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
        if (isExpectedApiError(hint)) return null;
        return scrubEvent(event);
    },
    beforeSendTransaction<T extends Event>(event: T): T {
        for (const span of event.spans ?? []) {
            if (span.description) span.description = scrubText(span.description);
            scrubData(span.data);
        }
        scrubData(event.contexts?.trace?.data);
        return scrubEvent(event);
    },
    beforeBreadcrumb: scrubBreadcrumb,
};
