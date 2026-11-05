import type { MetadataRoute } from 'next';

import { CAMPAIGN_SHORT_LINK_PREFIX } from '@/lib/campaignLinks';
import { absoluteUrl, isStagingSite } from '@/lib/seo';
import { SHARED_LINK_PREFIXES } from '@/lib/shareLinks';

// Session-gated and token-link routes. Kept explicit rather than derived from
// proxy.ts so a crawl rule never changes as a side effect of auth gating.
const PRIVATE_PATHS = [
    '/api/',
    '/admin',
    '/feed',
    '/home',
    '/notifications',
    '/profile',
    '/post/',
    '/events/',
    '/invite/',
    '/business',
    '/partner',
    '/q/',
    CAMPAIGN_SHORT_LINK_PREFIX,
];

// Link previews may follow these to the page that builds the card.
const LINK_PREVIEW_PATHS: readonly string[] = [...SHARED_LINK_PREFIXES, CAMPAIGN_SHORT_LINK_PREFIX];

// Only fetchers that build link previews, never search crawlers. They may read
// shared links to build the card; the pages carry noindex as well. A crawler
// follows the most specific group that names it, so this group repeats the
// private paths it must still stay out of.
const LINK_PREVIEW_BOTS = [
    'Twitterbot',
    'LinkedInBot',
    'facebookexternalhit',
    'Facebot',
    'WhatsApp',
    'TelegramBot',
    'Slackbot-LinkExpanding',
    'Discordbot',
];

export default function robots(): MetadataRoute.Robots {
    // Staging serves the same pages under another host; it must never be indexed.
    if (isStagingSite()) {
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
            {
                userAgent: LINK_PREVIEW_BOTS,
                allow: '/',
                disallow: PRIVATE_PATHS.filter((path) => !LINK_PREVIEW_PATHS.includes(path)),
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
