import type { VendorPageType } from '@/i18n/publicLocale';
import { sendLandingEvent } from '@/lib/landingTracking';

// Vendor page and business page events, sent like the landing's (Vercel Web Analytics, mirrored to Google
// Analytics with consent). 'all' is the business page itself.

export type VendorPageSource = VendorPageType | 'all';

// A link on a vendor page to another vendor page, or to the business page.
export type VendorPageLink = { type: VendorPageType; target: VendorPageSource };

const LINK_ATTRIBUTE = 'data-vendor-page-link';

export const VENDOR_PAGE_LINK_SELECTOR = `[${LINK_ATTRIBUTE}]`;

// Spread onto a link: the vendor page's click listener reads it back and sends the event.
export function vendorPageLinkAttributes(link: VendorPageLink) {
    return { [LINK_ATTRIBUTE]: JSON.stringify(link) };
}

export function readVendorPageLink(element: Element): VendorPageLink | null {
    const value = element.getAttribute(LINK_ATTRIBUTE);
    if (!value) return null;
    try {
        return JSON.parse(value) as VendorPageLink;
    } catch {
        return null;
    }
}

export function trackVendorPageLink(link: VendorPageLink) {
    sendLandingEvent('Vendor Page Link', link);
}

// A partner application that reached Spring, from a vendor page or the business page.
export function trackVendorPageApply(type: VendorPageSource, locale: string) {
    sendLandingEvent('Vendor Page Apply', { type, locale });
}
