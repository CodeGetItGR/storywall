import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { WEDDING_MARQUEE, WEDDING_QR_PHOTO, WEDDING_RSVP_PICTURES, WEDDING_WITHOUT_PHOTOS } from '@/lib/occasions/weddingMedia';

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
    it('points every picture at a WebP file in public/', () => {
        const all = sources([WEDDING_MARQUEE, WEDDING_QR_PHOTO, WEDDING_RSVP_PICTURES, WEDDING_WITHOUT_PHOTOS]);
        expect(all.length).toBeGreaterThan(30);
        for (const src of new Set(all)) {
            expect(src, src).toMatch(/\.webp$/);
            expect(existsSync(path.join(process.cwd(), 'public', src)), src).toBe(true);
        }
    });

    it('has a photo and an avatar for each of the fourteen marquee tiles', () => {
        expect(WEDDING_MARQUEE).toHaveLength(14);
    });
});
