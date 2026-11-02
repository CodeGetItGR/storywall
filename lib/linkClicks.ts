import { track } from '@vercel/analytics';

import { endpoints } from '@/lib/api/endpoints';
import type { LinkClickPlacement, LinkClickRequestDto, LinkClickTarget } from '@/lib/api/types';
import { pageLanguage } from '@/lib/campaignVisits';
import { trackAnalyticsEvent } from '@/lib/googleAnalytics';

// Clicks on our own links between public pages, for now links to the wedding QR page. Each goes to
// Spring's own counter (no cookie, counts every visitor) and to Vercel Web Analytics, mirrored to
// Google Analytics only with the visitor's consent. One listener in the public layout reads them back.

export type LinkClick = { target: LinkClickTarget; placement: LinkClickPlacement };

const LINK_CLICK_ATTRIBUTE = 'data-link-click';

export const LINK_CLICK_SELECTOR = `[${LINK_CLICK_ATTRIBUTE}]`;

const TARGETS: readonly LinkClickTarget[] = ['QR_WEDDING'];
const PLACEMENTS: readonly LinkClickPlacement[] = ['footer', 'faq', 'hero', 'why'];

// Spread onto a link to count its clicks.
export function linkClickAttributes(click: LinkClick) {
    return { [LINK_CLICK_ATTRIBUTE]: `${click.target}:${click.placement}` };
}

// The same for a link to the wedding QR page.
export function qrLinkAttributes(placement: LinkClickPlacement) {
    return linkClickAttributes({ target: 'QR_WEDDING', placement });
}

export function readLinkClick(element: Element): LinkClick | null {
    const [target, placement] = (element.getAttribute(LINK_CLICK_ATTRIBUTE) ?? '').split(':');
    if (!TARGETS.includes(target as LinkClickTarget) || !PLACEMENTS.includes(placement as LinkClickPlacement)) return null;
    return { target: target as LinkClickTarget, placement: placement as LinkClickPlacement };
}

// Best effort: keepalive lets the click that leaves the page still arrive; a failure is ignored.
// `pathname` is the page the link is on; its locale segment is also the language.
export function sendLinkClick(click: LinkClick, pathname: string) {
    const body: LinkClickRequestDto = { ...click, page: pathname, language: pageLanguage(pathname) };
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${endpoints.linkClicks.record}`, {
        method: 'POST',
        keepalive: true,
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).catch(() => undefined);
    // Vercel's Pro plan keeps at most two properties per event; it records the page itself.
    const properties = { link: click.target.toLowerCase(), placement: click.placement };
    track('Link Click', properties);
    trackAnalyticsEvent('link_click', properties);
}
