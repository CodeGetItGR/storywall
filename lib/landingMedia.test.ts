// @vitest-environment node
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern';
import { describe, expect, it } from 'vitest';

import nextConfig from '@/next.config.mjs';

import { landingMoreStoryMedia } from './landingMedia';

const remotePatterns = nextConfig.images?.remotePatterns ?? [];

describe('next/image remote patterns', () => {
    // next.config.mjs pins each Pexels photo by id; a photo added here without
    // its id there renders as a broken image on the landing page.
    it.each(landingMoreStoryMedia.map((media) => media.src))('allows the landing photo %s', (src) => {
        expect(hasRemoteMatch([], remotePatterns, new URL(src))).toBe(true);
    });

    it.each(['https://anyone.r2.dev/huge.png', 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', 'https://evil.example.com/a.jpg'])(
        'refuses %s',
        (src) => {
            expect(hasRemoteMatch([], remotePatterns, new URL(src))).toBe(false);
        },
    );
});
