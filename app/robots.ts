import type { MetadataRoute } from 'next';

import { CAMPAIGN_SHORT_LINK_PREFIX } from '@/lib/campaignLinks';
import { PUBLISHED_INVITATION_PATH_PREFIX } from '@/lib/invitation/inviteHost';
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
    '/save-my-date/editor',
    `${PUBLISHED_INVITATION_PATH_PREFIX}/`,
    CAMPAIGN_SHORT_LINK_PREFIX,
];

// Link previews may follow these to the page that builds the card. A published invitation's
// preview picture lives under its page.
const LINK_PREVIEW_PATHS: readonly string[] = [...SHARED_LINK_PREFIXES, CAMPAIGN_SHORT_LINK_PREFIX, `${PUBLISHED_INVITATION_PATH_PREFIX}/`];

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

// Cutouts and fragments that make no sense on their own in Google Images. Most are transparent,
// and the image optimizer hands crawlers a black-backed JPEG of them.
const IMAGE_SEARCH_HIDDEN_FILES = [
    '/landing/sw-scene-item-',
    '/landing/sw-phone-',
    '/landing/heart-eyes-reaction',
    '/landing/champagne-reaction',
    '/landing/storywall.webp',
    '/landing/storywall-2.webp',
    '/landing/qr-wedding/hero-',
    '/landing/qr-wedding/storywall-logo',
    '/landing/qr-wedding/demo-gallery-phones-',
    // Exact names: the wide "without-and-with" picture stays searchable.
    '/landing/wedding/wedding-rsvp-replies-with.webp',
    '/landing/wedding/wedding-rsvp-replies-with-en.webp',
    '/landing/wedding/wedding-rsvp-replies-without.webp',
    '/landing/wedding/wedding-rsvp-replies-without-en.webp',
];

const optimizerPath = (source: string) => `/_next/image?url=${encodeURIComponent(source)}`;

// Each file is blocked at its own URL and at its optimizer URL. Theme illustrations only reach the
// page through the optimizer; their own URLs are on another host.
const IMAGE_SEARCH_HIDDEN_PATHS = [
    ...IMAGE_SEARCH_HIDDEN_FILES.flatMap((file) => [file, optimizerPath(file)]),
    optimizerPath('https://demo-media.storywall.gr/theme-presets/'),
];

export default function robots(): MetadataRoute.Robots {
    // Staging serves the same pages under another host; it must never be indexed.
    if (isStagingSite()) {
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
            // Only the image crawler: Googlebot still loads these files to render the pages.
            // This group replaces "*" for it, so it repeats the private paths.
            { userAgent: 'Googlebot-Image', allow: '/', disallow: [...PRIVATE_PATHS, ...IMAGE_SEARCH_HIDDEN_PATHS] },
            {
                userAgent: LINK_PREVIEW_BOTS,
                allow: '/',
                disallow: PRIVATE_PATHS.filter((path) => !LINK_PREVIEW_PATHS.includes(path)),
            },
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
