// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

describe('more stories', () => {
    // Our own files, so the landing never depends on another site's image links.
    it.each(landingMoreStoryMedia.map((media) => media.src))('serves %s from the site', (src) => {
        expect(src).toMatch(/^\/landing\/[a-z0-9-]+\.webp$/);
        expect(existsSync(join(process.cwd(), 'public', src))).toBe(true);
    });

    it('has one photo and its alt text per card, in every language', () => {
        for (const messages of [en, el]) {
            const stories: { imageAlt?: string }[] = messages.LandingPage.stories.moreStories;
            expect(stories).toHaveLength(landingMoreStoryMedia.length);
            stories.forEach((story) => expect(story.imageAlt).toBeTruthy());
        }
    });
});

describe('next/image remote patterns', () => {
    it.each(['https://anyone.r2.dev/huge.png', 'https://images.pexels.com/photos/1/pexels-photo-1.jpeg', 'https://evil.example.com/a.jpg'])(
        'refuses %s',
        (src) => {
            expect(hasRemoteMatch([], remotePatterns, new URL(src))).toBe(false);
        },
    );
});
