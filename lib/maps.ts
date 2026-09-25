// Google only allows the `/maps?q=…&output=embed` form inside an iframe
// (it redirects to `/maps/embed`). Every other Maps URL — including the
// `/maps/place/…` links people copy from the address bar — is served with
// `X-Frame-Options: SAMEORIGIN`, so we extract the place from the link and
// rebuild it in that form instead of reusing the original path.

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);

function isGoogleHost(hostname: string): boolean {
    return /(^|\.)google\.[a-z.]+$/.test(hostname);
}

// `maps.app.goo.gl/…` is what the Share button in Google Maps produces. It
// carries no place info until its redirect is followed (see /api/maps/resolve).
export function isGoogleMapsShortLink(url: string | null): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'goo.gl') return parsed.pathname.startsWith('/maps');
        return SHORT_LINK_HOSTS.has(parsed.hostname);
    } catch {
        return false;
    }
}

// Returns the long google.com Maps URL a redirect points at, or null when the
// target is anything else. Google may bounce through its consent page first;
// the real destination then sits in its `continue` param.
export function readGoogleMapsRedirect(location: string | null, base: string): string | null {
    if (!location) return null;
    try {
        const target = new URL(location, base);
        if (target.hostname === 'consent.google.com') return readGoogleMapsRedirect(target.searchParams.get('continue'), base);
        return isGoogleHost(target.hostname) && target.pathname.startsWith('/maps') ? target.toString() : null;
    } catch {
        return null;
    }
}

function extractPlaceQuery(parsed: URL): string | null {
    const path = decodeURIComponent(parsed.pathname);

    // `!3d<lat>!4d<lng>` in the data segment is the pinned place itself.
    const pinned = path.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (pinned) return `${pinned[1]},${pinned[2]}`;

    const param = parsed.searchParams.get('q') ?? parsed.searchParams.get('query') ?? parsed.searchParams.get('ll');
    if (param?.trim()) return param.trim();

    const place = path.match(/\/maps\/(?:place|search)\/([^/]+)/);
    if (place) return place[1].replace(/\+/g, ' ');

    // `@<lat>,<lng>,<zoom>z` is only the viewport centre, so it comes last.
    const viewport = path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (viewport) return `${viewport[1]},${viewport[2]}`;

    return null;
}

export function buildGoogleMapsEmbedUrl(url: string | null, locale: string): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        if (!isGoogleHost(parsed.hostname)) return null;

        const query = extractPlaceQuery(parsed);
        if (!query) return null;

        const embed = new URL('https://www.google.com/maps');
        embed.searchParams.set('q', query);
        embed.searchParams.set('z', '15');
        embed.searchParams.set('hl', locale);
        embed.searchParams.set('output', 'embed');
        return embed.toString();
    } catch {
        return null;
    }
}
