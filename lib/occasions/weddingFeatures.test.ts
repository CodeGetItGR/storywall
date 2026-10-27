import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { WEDDING_FEATURE_ORDER, WEDDING_PRIVATE_ICONS, weddingFeatures } from '@/lib/occasions/weddingFeatures';

describe('weddingFeatures', () => {
    it('puts the offered features in the design order', () => {
        const offered = ['invitation', 'posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'schedule', 'quiz_polls'];
        expect(weddingFeatures(offered).map((feature) => feature.key)).toEqual([...WEDDING_FEATURE_ORDER]);
    });

    it('leaves out what the config does not offer', () => {
        expect(weddingFeatures(['gallery', 'invitation']).map((feature) => feature.key)).toEqual(['invitation', 'gallery']);
    });

    it('puts a feature the design has no slot for last, with the generic icon', () => {
        expect(weddingFeatures(['he_or_she', 'invitation'])).toEqual([
            { key: 'invitation', icon: '/landing/wedding/icons/invitation.webp' },
            { key: 'he_or_she', icon: '/landing/decor-05.webp' },
        ]);
    });

    it('points every icon at a file in public/', () => {
        const icons = [...weddingFeatures([...WEDDING_FEATURE_ORDER]).map((feature) => feature.icon), ...WEDDING_PRIVATE_ICONS];
        for (const icon of icons) expect(existsSync(path.join(process.cwd(), 'public', icon)), icon).toBe(true);
    });
});
