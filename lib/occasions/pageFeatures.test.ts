import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { OCCASION_PAGE_FEATURE_ORDER, OCCASION_PRIVATE_ICONS, occasionPageFeatures } from '@/lib/occasions/pageFeatures';

describe('occasionPageFeatures', () => {
    it('puts the offered features in the design order', () => {
        const offered = ['invitation', 'posts', 'rsvp', 'playlist', 'stories', 'gallery', 'wishlist', 'wishbook', 'schedule', 'quiz_polls'];
        expect(occasionPageFeatures(offered).map((feature) => feature.key)).toEqual([...OCCASION_PAGE_FEATURE_ORDER]);
    });

    it('leaves out what the config does not offer', () => {
        expect(occasionPageFeatures(['gallery', 'invitation']).map((feature) => feature.key)).toEqual(['invitation', 'gallery']);
    });

    it('puts a feature the design has no slot for last, with the generic icon', () => {
        expect(occasionPageFeatures(['he_or_she', 'invitation'])).toEqual([
            { key: 'invitation', icon: '/landing/wedding/icons/invitation.webp' },
            { key: 'he_or_she', icon: '/landing/decor-05.webp' },
        ]);
    });

    it('points every icon at a file in public/', () => {
        const icons = [...occasionPageFeatures([...OCCASION_PAGE_FEATURE_ORDER]).map((feature) => feature.icon), ...OCCASION_PRIVATE_ICONS];
        for (const icon of icons) expect(existsSync(path.join(process.cwd(), 'public', icon)), icon).toBe(true);
    });
});
