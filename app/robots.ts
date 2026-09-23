import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';

// Session-gated and token-link routes. Kept explicit rather than derived from
// proxy.ts so a crawl rule never changes as a side effect of auth gating.
const PRIVATE_PATHS = ['/api/', '/admin', '/feed', '/home', '/notifications', '/profile', '/post/', '/events/', '/invite/', '/partners/', '/q/'];

export default function robots(): MetadataRoute.Robots {
    // Staging serves the same pages under another host; it must never be indexed.
    if (process.env.NEXT_PUBLIC_APP_ENV === 'staging') {
        return { rules: { userAgent: '*', disallow: '/' } };
    }

    return {
        rules: { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
