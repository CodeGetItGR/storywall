import type { ConsentChoice } from '@/lib/consent';

// gtag.js, shared by Google Ads and Google Analytics: one script, one config
// per id the visitor agreed to.

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

type Gtag = NonNullable<Window['gtag']>;

// Ids already configured on each gtag instance, so a re-render or a change of
// mind never configures one twice.
const configuredIds = new WeakMap<Gtag, Set<string>>();

export function googleTagScriptUrl(tagId: string): string {
    return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
}

// The queue gtag.js reads once it loads. Everything starts denied, so nothing
// is stored until a consent update grants it.
export function ensureGoogleTag(): void {
    if (window.gtag) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        // gtag.js expects the arguments object itself, not an array.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
    };
    window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
    });
    window.gtag('js', new Date());
}

// Passes the visitor's choice on. A no-op until the tag has been set up.
export function updateGoogleTagConsent({ ads, analytics }: ConsentChoice): void {
    const adsValue = ads ? 'granted' : 'denied';
    window.gtag?.('consent', 'update', {
        ad_storage: adsValue,
        ad_user_data: adsValue,
        ad_personalization: adsValue,
        analytics_storage: analytics ? 'granted' : 'denied',
    });
}

export function configureGoogleTag(tagId: string, params?: Record<string, unknown>): void {
    const gtag = window.gtag;
    if (!gtag) return;

    const configured = configuredIds.get(gtag) ?? new Set<string>();
    if (configured.has(tagId)) return;
    configured.add(tagId);
    configuredIds.set(gtag, configured);
    gtag('config', tagId, params);
}
