import { describe, expect, it } from 'vitest';

import { activeTheme, type OccasionTheme } from '@/lib/occasions/themes';

const winter: OccasionTheme = { id: 'winter', startsAt: '2026-12-01T00:00:00+02:00', endsAt: '2027-01-08T00:00:00+02:00' };
const weddingSpring: OccasionTheme = { id: 'winter', occasions: ['WEDDING'], startsAt: '2027-03-01T00:00:00Z', endsAt: '2027-04-01T00:00:00Z' };

describe('activeTheme', () => {
    it('applies inside its window', () => {
        expect(activeTheme('BAPTISM', new Date('2026-12-24T12:00:00Z'), [winter])).toBe('winter');
        expect(activeTheme('BAPTISM', new Date('2027-01-08T00:00:00+02:00'), [winter])).toBeNull();
    });

    it('respects an occasion filter', () => {
        expect(activeTheme('BAPTISM', new Date('2027-03-10T00:00:00Z'), [weddingSpring])).toBeNull();
        expect(activeTheme('WEDDING', new Date('2027-03-10T00:00:00Z'), [weddingSpring])).toBe('winter');
    });
});
