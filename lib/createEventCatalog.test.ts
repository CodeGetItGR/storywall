import { describe, expect, it } from 'vitest';

import { createEventTypePhoto } from '@/lib/createEventCatalog';

describe('createEventTypePhoto', () => {
    it('prefers the photo an admin uploaded', () => {
        expect(createEventTypePhoto('WEDDING', 'https://r2.test/w.jpg')).toBe('https://r2.test/w.jpg');
    });

    it('falls back to a landing photo of that type', () => {
        expect(createEventTypePhoto('WEDDING', null)).toBe('/landing/03-wedding-ceremony-santorini.webp');
        expect(createEventTypePhoto('GENDER_REVEAL', null)).toBe('/landing/gender-reveal-box-opening-with-blue-balloons-and-confetti.webp');
    });

    it('has a photo for every type', () => {
        for (const type of ['WEDDING', 'BAPTISM', 'SOCIAL_EVENT', 'BIRTHDAY', 'PRIVATE_PARTY', 'GENDER_REVEAL', 'BABY_SHOWER', 'REUNION'] as const) {
            expect(createEventTypePhoto(type, null)).toMatch(/^\/landing\/.+\.webp$/);
        }
    });
});
