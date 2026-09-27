// Bug reports and crash reports are read by admins, so no capability token
// may reach them. API paths and page URLs are sent as route templates with
// `:param` placeholders (beta-feedback-fe-integration.md §4).

const API_TOKEN_ROUTES: Array<[RegExp, string]> = [
    [/^\/api\/qr\/[^/]+/, '/api/qr/:token'],
    [/^\/api\/event-invitations\/[^/]+\/(preview|accept)$/, '/api/event-invitations/:inviteToken/$1'],
    [/^\/api\/partners\/[^/]+/, '/api/partners/:token'],
];

// Drops the query and fragment, and swaps a token segment for its placeholder.
export function redactApiPath(path: string): string {
    const pathname = path.split(/[?#]/, 1)[0];
    for (const [pattern, template] of API_TOKEN_ROUTES) {
        if (pattern.test(pathname)) return pathname.replace(pattern, template);
    }
    return pathname;
}

type RouteParams = Record<string, string | string[] | undefined>;

// Rebuilds the matched route template from the resolved pathname and the
// router's params: `/q/abc123` with `{ token: 'abc123' }` → `/q/:token`.
// A catch-all param becomes one placeholder per segment it matched.
export function toRouteTemplate(pathname: string, params: RouteParams | null | undefined): string {
    const bySegment = new Map<string, string>();
    for (const [name, value] of Object.entries(params ?? {})) {
        if (value === undefined) continue;
        for (const segment of Array.isArray(value) ? value : [value]) {
            if (segment) bySegment.set(segment, name);
        }
    }

    const cleanPath = pathname.split(/[?#]/, 1)[0];
    return cleanPath
        .split('/')
        .map((segment) => {
            const name = bySegment.get(safeDecode(segment));
            return name ? `:${name}` : segment;
        })
        .join('/');
}

function safeDecode(segment: string): string {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

// The current page's template, kept up to date by RouteTemplateTracker so
// code outside React (the crash reporter) can read it. Until the first
// render it holds '/', never a resolved path.
let currentRouteTemplate = '/';

export function setCurrentRouteTemplate(template: string): void {
    currentRouteTemplate = template;
}

export function getCurrentRouteTemplate(): string {
    return currentRouteTemplate;
}

export function currentPageUrl(): string | null {
    if (typeof window === 'undefined') return null;
    return `${window.location.origin}${currentRouteTemplate}`;
}
