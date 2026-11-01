import { type Locale, locales } from '@/i18n/config';
import { QR_WEDDING_PATHS } from '@/i18n/publicLocale';
import type { AppConfigResponseDto } from '@/lib/api/types';
import { eventTypeSlug } from '@/lib/eventTypeSlug';
import { occasionPath, readyOccasions } from '@/lib/occasions/occasions';
import { routes } from '@/lib/routes';
import { showsUnreleasedPages } from '@/lib/unreleasedPages';

const WEDDING_SLUG = eventTypeSlug('WEDDING');

export const QR_WEDDING_CREATE_HREF = routes.events.new({ type: WEDDING_SLUG });
export const QR_WEDDING_DEMO_HREF = routes.demoEventType(WEDDING_SLUG);
export const QR_WEDDING_GALLERY_HREF = routes.demoGallery(WEDDING_SLUG);
// What the page's sample QR code opens: the upload page guests see after scanning.
export const QR_WEDDING_UPLOAD_HREF = routes.demoUpload(WEDDING_SLUG);

// The page's images, under public/.
export const QR_WEDDING_MEDIA = '/landing/qr-wedding';

// Section ids the header, footer and in-page links point at.
export const QR_WEDDING_SECTION = {
    top: 'top',
    howItWorks: 'howItWorks',
    why: 'giati',
    tryIt: 'dokimase',
    compare: 'sygkrisi',
    timeline: 'vradia',
    cards: 'karta-qr',
    features: 'dynatotites',
    demo: 'demo',
    pricing: 'pricing',
    faq: 'faq',
    create: 'create',
} as const;

// The page is about weddings alone: live while the WEDDING type is on. Unknown (config failed) → live.
// Off the production site until launch (lib/unreleasedPages.ts).
export function qrWeddingPageLive(config: AppConfigResponseDto | null): boolean {
    if (!showsUnreleasedPages()) return false;
    return !config || config.eventTypes.some((type) => type.eventTypeKey === 'WEDDING' && type.isEnabled);
}

// The wedding page in the locale's language, the page's parent in its breadcrumb. Null without one.
export function qrWeddingParentPath(locale: Locale): string | null {
    const wedding = readyOccasions().find((occasion) => occasion.eventType === 'WEDDING');
    return wedding ? occasionPath(wedding, locale) : null;
}

// The English page's earlier URLs. They move to the current one for good once the page is live.
const MOVED_QR_WEDDING_PATHS = ['/wedding-qr-code', '/en/wedding-qr-code'];

// Until launch, the page's URLs were already indexed and shared, so they open the wedding page in the
// same language instead of a 404. Read by proxy.ts, which redirects temporarily (307): the page comes
// back at the same URL. Null for any other path, once the page is live, or with no wedding page.
export function qrWeddingRedirectPath(pathname: string): string | null {
    if (showsUnreleasedPages()) return null;
    const locale = MOVED_QR_WEDDING_PATHS.includes(pathname) ? 'en' : locales.find((candidate) => QR_WEDDING_PATHS[candidate] === pathname);
    const wedding = readyOccasions().find((occasion) => occasion.eventType === 'WEDDING');
    return locale && wedding ? occasionPath(wedding, locale) : null;
}

// Where an earlier URL of the English page now lives, for proxy.ts to redirect permanently (308). Null for
// any other path and before launch, when qrWeddingRedirectPath sends it to the wedding page instead.
export function qrWeddingMovedPath(pathname: string): string | null {
    if (!showsUnreleasedPages() || !MOVED_QR_WEDDING_PATHS.includes(pathname)) return null;
    return QR_WEDDING_PATHS.en;
}

export type QrWeddingFaqLink = { label: string; to: 'gallery' | 'terms' | 'pricing' };
export type QrWeddingFaqItem = { q: string; a: string; link?: QrWeddingFaqLink };

// The FAQ with the cheapest package's price filled in. An answer that quotes the price is left out
// when the packages can't be read, rather than shown with a gap.
export function qrWeddingFaqItems(items: QrWeddingFaqItem[], price: string): QrWeddingFaqItem[] {
    return items.flatMap((item) => {
        if (!item.a.includes('{price}')) return [item];
        return price ? [{ ...item, a: item.a.replaceAll('{price}', price) }] : [];
    });
}
