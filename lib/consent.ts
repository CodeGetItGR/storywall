// The visitor's cookie choice. Read only in the browser so the landing page
// stays static; the server never sees or depends on it.

export type Consent = {
    v: number;
    ads: boolean;
    at: string;
};

export const CONSENT_COOKIE = 'sw_consent';
// Bump to ask everyone again, e.g. when a new optional category is added.
export const CONSENT_VERSION = 1;
// Six months, then the banner asks again.
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;
// Google Ads' click and conversion cookies.
const AD_COOKIE_PREFIX = '_gcl_';

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
        if (parsed.v !== CONSENT_VERSION || typeof parsed.ads !== 'boolean' || typeof parsed.at !== 'string') return null;
        return { v: parsed.v, ads: parsed.ads, at: parsed.at };
    } catch {
        return null;
    }
}

export function writeConsent(ads: boolean): Consent {
    const consent: Consent = { v: CONSENT_VERSION, ads, at: new Date().toISOString() };
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
    if (typeof document === 'undefined') return;

    const names = document.cookie
        .split(';')
        .map((part) => part.trim().split('=')[0])
        .filter((name) => name.startsWith(AD_COOKIE_PREFIX));

    for (const name of names) {
        const expired = `${name}=; Max-Age=0; Path=/`;
        document.cookie = expired;
        for (const domain of cookieDomains(window.location.hostname)) document.cookie = `${expired}; Domain=${domain}`;
    }
}
