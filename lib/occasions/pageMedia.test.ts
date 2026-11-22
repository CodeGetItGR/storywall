import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { BAPTISM_PAGE_MEDIA, WEDDING_PAGE_MEDIA } from '@/lib/occasions/pageMedia';

// Every { src } anywhere in the maps.
function sources(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(sources);
    if (value && typeof value === 'object') {
        const { src } = value as { src?: unknown };
        return typeof src === 'string' ? [src] : Object.values(value).flatMap(sources);
    }
    return [];
}

describe.each([
    ['wedding', WEDDING_PAGE_MEDIA],
    ['baptism', BAPTISM_PAGE_MEDIA],
] as const)('%s page media', (_, media) => {
    it('points every picture at a WebP file in public/', () => {
        for (const src of new Set(sources(media))) {
            expect(src, src).toMatch(/\.webp$/);
            expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
        }
    });

    it('has three photos for "without StoryWall"', () => {
        expect(media.withoutPhotos).toHaveLength(3);
    });
});

describe('page media', () => {
    it("keeps the wedding's fourteen marquee tiles and the landing's hero", () => {
        expect(WEDDING_PAGE_MEDIA.guestPhotos).toHaveLength(14);
        expect(WEDDING_PAGE_MEDIA.hero).toBeNull();
        expect(WEDDING_PAGE_MEDIA.themesPhone).toBeNull();
    });

    it("gives the baptism its feed screenshot, three guest photos and the wedding's RSVP pictures", () => {
        expect(BAPTISM_PAGE_MEDIA.hero?.feed.src).toBe('/landing/baptism/baptism-event-feed-unicorn-theme.webp');
        expect(BAPTISM_PAGE_MEDIA.themesPhone).toBe(BAPTISM_PAGE_MEDIA.hero?.feed);
        expect(BAPTISM_PAGE_MEDIA.guestPhotos).toHaveLength(3);
        expect(BAPTISM_PAGE_MEDIA.rsvpPictures).toBe(WEDDING_PAGE_MEDIA.rsvpPictures);
    });
});
