import { describe, expect, it } from 'vitest';

import { mapsUrl, websiteUrl } from '@/lib/invitation/mapLinks';

describe('mapsUrl', () => {
    it('searches for the name and address', () => {
        expect(mapsUrl('Κτήμα', 'Ρόδος')).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Κτήμα, Ρόδος')}`);
    });

    it('uses whichever of the two exists', () => {
        expect(mapsUrl('', 'Ρόδος')).toContain(encodeURIComponent('Ρόδος'));
        expect(mapsUrl('', 'Ρόδος')).not.toContain('%2C');
    });

    it('opens the map itself when there is nothing to search for', () => {
        expect(mapsUrl('', '')).toBe('https://maps.google.com');
    });
});

describe('websiteUrl', () => {
    it('adds https when it is missing', () => {
        expect(websiteUrl('hotel.gr')).toBe('https://hotel.gr');
        expect(websiteUrl('  //hotel.gr ')).toBe('https://hotel.gr');
    });

    it('keeps an address that already has one', () => {
        expect(websiteUrl('http://hotel.gr')).toBe('http://hotel.gr');
        expect(websiteUrl('HTTPS://hotel.gr')).toBe('HTTPS://hotel.gr');
    });

    it('stays empty without a website', () => {
        expect(websiteUrl('  ')).toBe('');
    });
});
