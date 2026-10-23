type VitalEvent = { url: string; route?: string };
type PageviewEvent = { url: string };
type RouteParams = Record<string, string | string[] | undefined>;

// Invite, QR, gift and email links carry a token in their URL, so Vercel's dashboards get each page
// under its route (`/invite/[token]`) with no query, never its real URL.

// Speed Insights reports each Web Vital with its route. One without a route isn't sent.
export function redactVitalUrl<T extends VitalEvent>(event: T): T | null {
    if (!event.route) return null;
    return { ...event, url: `${new URL(event.url).origin}${event.route}` };
}

// Web Analytics reports only the URL, so the route is rebuilt from the page's params.
export function redactPageviewUrl<T extends PageviewEvent>(event: T, params: RouteParams): T {
    const url = new URL(event.url);
    return { ...event, url: `${url.origin}${pageRoute(url.pathname, params)}` };
}

// `/invite/abc` with { token: 'abc' } is `/invite/[token]`. Catch-all params (`[...role]`) span several
// segments. A URL's path is percent-encoded and a param may not be, so both spellings are matched.
export function pageRoute(pathname: string, params: RouteParams): string {
    let route = pathname;
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value.length === 0) continue;
        const segments = Array.isArray(value) ? value : [value];
        const spellings = [segments.join('/'), segments.map(encodeURIComponent).join('/')].map(escapeRegExp);
        const name = Array.isArray(value) ? `[...${key}]` : `[${key}]`;
        route = route.replace(new RegExp(`/(?:${spellings.join('|')})(?=/|$)`), `/${name}`);
    }
    return route;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
