import { describe, expect, it } from 'vitest';

import { resolveSessionLocationIcon } from '@/lib/sessionLocations';

describe('resolveSessionLocationIcon', () => {
    it('keeps the church for a wedding or baptism main session', () => {
        expect(resolveSessionLocationIcon('WEDDING', 'main').src).toBe('/icons/church.svg');
        expect(resolveSessionLocationIcon('BAPTISM', 'main').src).toBe('/icons/church.svg');
    });

    it('gives every other event type a balloon for its main session', () => {
        for (const eventType of ['SOCIAL_EVENT', 'BIRTHDAY', 'PRIVATE_PARTY', 'GENDER_REVEAL', 'BABY_SHOWER', 'REUNION'] as const) {
            expect(resolveSessionLocationIcon(eventType, 'main').src).toBe('/icons/balloon.svg');
        }
    });

    it('leaves a secondary session without a convention on the map pin', () => {
        expect(resolveSessionLocationIcon('BIRTHDAY', 'secondary').kind).toBe('map-pin');
    });
});
