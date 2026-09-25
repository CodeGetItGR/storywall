import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';
import { SHARED_LINK_PREFIXES } from '@/lib/shareLinks';

// Session-gated and token-link routes. Kept explicit rather than derived from
// proxy.ts so a crawl rule never changes as a side effect of auth gating.
const PRIVATE_PATHS = ['/api/', '/admin', '/feed', '/home', '/notifications', '/profile', '/post/', '/events/', '/invite/', '/partners/', '/q/'];

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
    if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') {
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
            {
                userAgent: LINK_PREVIEW_BOTS,
                allow: '/',
                disallow: PRIVATE_PATHS.filter((path) => !(SHARED_LINK_PREFIXES as readonly string[]).includes(path)),
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
