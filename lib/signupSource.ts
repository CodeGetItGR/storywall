import { defaultLocale, locales } from '@/i18n/config';
import { isQrWeddingPath } from '@/i18n/publicLocale';
import { OCCASIONS } from '@/lib/occasions/occasions';
import { pageRoute } from '@/lib/vercelInsights';

type RouteParams = Record<string, string | string[] | undefined>;

// Where a visitor came from, saved with their account if they sign up (Spring decides the channel).
// Never a full URL, a click id or a token. The caps match Spring's VisitSourceDto validation.
export type VisitSource = {
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    adClick: boolean;
    referrerHost: string | null;
    landingPage: string;
};

// Carries the source across the full page load from a landing page into the app.
export const VISIT_SOURCE_PARAM = 'src';
// Kept 30 days, and only with analytics consent.
export const VISIT_SOURCE_COOKIE = 'sw_src';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const UTM_MAX = 100;
const HOST_MAX = 255;
const PAGE_MAX = 255;
const AD_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid'];
const GIFT_PAGE = '/gift/';
const HOST_PATTERN = /^[a-z0-9.-]+$/;
const PAGE_PATTERN = /^\/[\x21-\x7e]*$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

function cleanText(value: unknown, max: number): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(CONTROL_CHARACTERS, '').trim().slice(0, max);
    return cleaned || null;
}

function cleanHost(value: unknown): string | null {
    const host = cleanText(value, HOST_MAX)?.toLowerCase() ?? null;
    return host && HOST_PATTERN.test(host) ? host : null;
}

function cleanPage(value: unknown): string | null {
    const page = cleanText(value, PAGE_MAX);
    return page && PAGE_PATTERN.test(page) ? page : null;
}

function parseUrl(value: string): URL | null {
    if (!value) return null;
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

// A source rebuilt from untrusted JSON (the src param or the cookie), every field checked.
function sanitizeVisitSource(raw: unknown): VisitSource | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    const landingPage = cleanPage(value.landingPage);
    if (!landingPage) return null;
    return {
        utmSource: cleanText(value.utmSource, UTM_MAX),
        utmMedium: cleanText(value.utmMedium, UTM_MAX),
        utmCampaign: cleanText(value.utmCampaign, UTM_MAX),
        adClick: value.adClick === true,
        referrerHost: cleanHost(value.referrerHost),
        landingPage,
    };
}

export function encodeVisitSource(source: VisitSource): string {
    return JSON.stringify(source);
}

export function decodeVisitSource(value: string | null): VisitSource | null {
    if (!value) return null;
    try {
        return sanitizeVisitSource(JSON.parse(value));
    } catch {
        return null;
    }
}

// This page load's source. Null when it was reached from this site with nothing new to say (a
// reload, or an in-site link without campaign parameters).
export function captureVisitSource(href: string, referrer: string, params: RouteParams): VisitSource | null {
    const url = new URL(href);
    const carried = decodeVisitSource(url.searchParams.get(VISIT_SOURCE_PARAM));
    if (carried) return carried;

    const utmSource = cleanText(url.searchParams.get('utm_source'), UTM_MAX);
    const utmMedium = cleanText(url.searchParams.get('utm_medium'), UTM_MAX);
    const utmCampaign = cleanText(url.searchParams.get('utm_campaign'), UTM_MAX);
    const adClick = AD_CLICK_PARAMS.some((name) => url.searchParams.has(name));
    const referrerUrl = parseUrl(referrer);
    const fromThisSite = referrerUrl?.origin === url.origin;
    if (fromThisSite && !utmSource && !utmMedium && !utmCampaign && !adClick) return null;

    return {
        utmSource,
        utmMedium,
        utmCampaign,
        adClick,
        referrerHost: referrerUrl && !fromThisSite ? cleanHost(referrerUrl.hostname) : null,
        landingPage: cleanPage(pageRoute(url.pathname, params)) ?? '/',
    };
}

// The first visit wins; a gift page replaces it.
export function pickVisitSource(saved: VisitSource | null, incoming: VisitSource | null): VisitSource | null {
    if (!incoming) return saved;
    if (!saved || incoming.landingPage.startsWith(GIFT_PAGE)) return incoming;
    return saved;
}

// Pages under app/(landing): `/`, `/for-business`, `/qr-code-for-wedding-photos`, a locale's pages (`/el/...`) and
// the default locale's occasion pages (`/weddings`). Leaving one for any other page is a full page load
// (another root layout).
export function isLandingPath(pathname: string): boolean {
    if (pathname === '/' || pathname === '/for-business' || isQrWeddingPath(pathname)) return true;
    const segments = pathname.split('/');
    if ((locales as readonly string[]).includes(segments[1])) return true;
    return segments.length === 2 && OCCASIONS.some((occasion) => occasion.slugs[defaultLocale] === segments[1]);
}

// The address without a carried src, for replacing the one in the address bar; null if it had none.
export function withoutVisitSourceParam(href: string): string | null {
    const url = new URL(href);
    if (!url.searchParams.has(VISIT_SOURCE_PARAM)) return null;
    url.searchParams.delete(VISIT_SOURCE_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
}

// A query string split into the carried src (decoded) and the rest, which keeps its exact encoding.
// The proxy uses it so a login redirect puts the source on the login page, not in its return path.
export function takeVisitSourceParam(search: string): { search: string; source: string | null } {
    const prefix = `${VISIT_SOURCE_PARAM}=`;
    const pairs = search.replace(/^\?/, '').split('&').filter(Boolean);
    const carried = pairs.find((pair) => pair.startsWith(prefix));
    if (!carried) return { search, source: null };
    const rest = pairs.filter((pair) => pair !== carried);
    let source: string | null;
    try {
        source = decodeURIComponent(carried.slice(prefix.length).replace(/\+/g, ' '));
    } catch {
        source = null;
    }
    return { search: rest.length ? `?${rest.join('&')}` : '', source };
}

// Where a click on a landing page should go instead, carrying the source: only a plain click on a
// same-site link out of the landing pages. Null leaves the click alone.
export function carryClickTarget(event: MouseEvent, origin: string, source: VisitSource | null): string | null {
    if (!source || event.defaultPrevented || event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (!(event.target instanceof Element)) return null;

    const link = event.target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download')) return null;
    if (link.target && link.target !== '_self') return null;

    const url = parseUrl(link.href);
    if (!url || url.origin !== origin || isLandingPath(url.pathname)) return null;
    url.searchParams.set(VISIT_SOURCE_PARAM, encodeVisitSource(source));
    return url.toString();
}

export function readVisitSourceCookie(): VisitSource | null {
    if (typeof document === 'undefined') return null;
    const prefix = `${VISIT_SOURCE_COOKIE}=`;
    const part = document.cookie
        .split(';')
        .map((piece) => piece.trim())
        .find((piece) => piece.startsWith(prefix));
    if (!part) return null;
    try {
        return decodeVisitSource(decodeURIComponent(part.slice(prefix.length)));
    } catch {
        return null;
    }
}

export function writeVisitSourceCookie(source: VisitSource): void {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${VISIT_SOURCE_COOKIE}=${encodeURIComponent(encodeVisitSource(source))}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

// Page memory: this tab's source until the next full page load. Nothing stored on the device.
let remembered: VisitSource | null = null;

export function rememberVisitSource(source: VisitSource | null): void {
    remembered = source;
}

export function currentVisitSource(): VisitSource | null {
    return remembered ?? readVisitSourceCookie();
}
