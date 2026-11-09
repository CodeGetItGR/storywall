// The visitor's cookie choice. Read only in the browser so the landing page
// stays static; the server never sees or depends on it.

import { VISIT_SOURCE_COOKIE } from '@/lib/signupSource';

export type ConsentChoice = {
    ads: boolean;
    analytics: boolean;
};

export type Consent = ConsentChoice & {
    v: number;
    at: string;
};

export const CONSENT_COOKIE = 'sw_consent';
// The last campaign link, kept only with analytics consent. Defined here so lib/campaignAttribution.ts can read the consent without a cycle.
export const CAMPAIGN_ATTRIBUTION_COOKIE = 'sw_campaign';
// Bump to ask everyone again, e.g. when a new optional category is added or a switch's meaning widens.
export const CONSENT_VERSION = 4;
// Six months, then the banner asks again.
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;
// Google Ads' click and conversion cookies, and the Meta Pixel's (_fbp, _fbc).
const AD_COOKIE_PREFIXES = ['_gcl_', '_fbp', '_fbc'];
// Google Analytics' visitor and session cookies (_ga, _ga_<id>).
const ANALYTICS_COOKIE_PREFIX = '_ga';

function readCookie(name: string): string | null {
    for (const part of document.cookie.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return rest.join('=');
    }
    return null;
}

export function readConsent(): Consent | null {
    if (typeof document === 'undefined') return null;

    const raw = readCookie(CONSENT_COOKIE);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Consent>;
        if (parsed.v !== CONSENT_VERSION || typeof parsed.ads !== 'boolean' || typeof parsed.analytics !== 'boolean' || typeof parsed.at !== 'string')
            return null;
        return { v: parsed.v, ads: parsed.ads, analytics: parsed.analytics, at: parsed.at };
    } catch {
        return null;
    }
}

export function writeConsent({ ads, analytics }: ConsentChoice): Consent {
    const consent: Consent = { v: CONSENT_VERSION, ads, analytics, at: new Date().toISOString() };
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    return consent;
}

// The host and every parent domain above it (www.storywall.gr → storywall.gr),
// since Google sets its cookies on the top-most one it can.
function cookieDomains(hostname: string): string[] {
    const labels = hostname.split('.');
    const domains: string[] = [];
    for (let i = 0; i < labels.length - 1; i++) domains.push(labels.slice(i).join('.'));
    return domains;
}

export function clearAdCookies(): void {
    for (const prefix of AD_COOKIE_PREFIXES) clearCookiesStartingWith(prefix);
}

// Google Analytics' cookies, and the signup source and campaign link, which are kept only with analytics consent.
export function clearAnalyticsCookies(): void {
    clearCookiesStartingWith(ANALYTICS_COOKIE_PREFIX);
    clearCookiesStartingWith(VISIT_SOURCE_COOKIE);
    clearCookiesStartingWith(CAMPAIGN_ATTRIBUTION_COOKIE);
}

function clearCookiesStartingWith(prefix: string): void {
    if (typeof document === 'undefined') return;

    const names = document.cookie
        .split(';')
        .map((part) => part.trim().split('=')[0])
        .filter((name) => name.startsWith(prefix));

    for (const name of names) {
        const expired = `${name}=; Max-Age=0; Path=/`;
        document.cookie = expired;
        for (const domain of cookieDomains(window.location.hostname)) document.cookie = `${expired}; Domain=${domain}`;
    }
}
