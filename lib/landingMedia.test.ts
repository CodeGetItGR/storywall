// @vitest-environment node
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern';
import { describe, expect, it } from 'vitest';

import el from '@/messages/el.json';
import en from '@/messages/en.json';
import nextConfig from '@/next.config.mjs';

import { landingMoreStoryMedia, landingStoryMedia } from './landingMedia';

const remotePatterns = nextConfig.images?.remotePatterns ?? [];

describe('story rows', () => {
    // A row without its own label would drop the link to its occasion page.
    it('name the occasion page they link to, in every language', () => {
        for (const messages of [en, el]) {
            const rows: { occasionLink?: string }[] = messages.LandingPage.stories.rows;
            expect(rows).toHaveLength(landingStoryMedia.length);
            landingStoryMedia.forEach((media, index) => {
                if (media.occasion) expect(rows[index]?.occasionLink).toBeTruthy();
            });
        }
    });
});

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
