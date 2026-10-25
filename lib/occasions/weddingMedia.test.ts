import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    WEDDING_DEMO_MEDIA,
    WEDDING_HERO_MEDIA,
    WEDDING_MARQUEE,
    WEDDING_QR_PHOTO,
    WEDDING_RSVP_AVATARS,
    WEDDING_WITHOUT_PHOTOS,
} from '@/lib/occasions/weddingMedia';

// Every { src } anywhere in the maps.
function sources(value: unknown): string[] {
    if (Array.isArray(value)) return value.flatMap(sources);
    if (value && typeof value === 'object') {
        const { src } = value as { src?: unknown };
        return typeof src === 'string' ? [src] : Object.values(value).flatMap(sources);
    }
    return [];
}

describe('wedding media', () => {
    it('points every photo at a file in public/', () => {
        const all = sources([
            WEDDING_HERO_MEDIA,
            WEDDING_DEMO_MEDIA,
            WEDDING_MARQUEE,
            WEDDING_QR_PHOTO,
            WEDDING_RSVP_AVATARS,
            WEDDING_WITHOUT_PHOTOS,
        ]);
        expect(all.length).toBeGreaterThan(60);
        for (const src of new Set(all)) expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
    });

    it('has a photo set for each of the nine hero posts and the fourteen marquee tiles', () => {
        expect(WEDDING_HERO_MEDIA.posts).toHaveLength(9);
        expect(WEDDING_MARQUEE).toHaveLength(14);
        expect(WEDDING_RSVP_AVATARS).toHaveLength(5);
    });
});
