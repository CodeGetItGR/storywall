import { describe, expect, it } from 'vitest';

import { programIconKeyForLabel } from '@/lib/invitation/programIcons';

describe('programIconKeyForLabel', () => {
    it.each([
        ['Μυστήριο', 'baptism'],
        ['Τελετή', 'church'],
        ['Welcome Drink', 'champagne'],
        ['Δεξίωση', 'dinner'],
        ['Κοπή τούρτας', 'cake'],
        ['Πρώτος χορός', 'dance'],
        ['After Party', 'disco'],
    ])('picks an icon from "%s"', (label, key) => {
        expect(programIconKeyForLabel(label)).toBe(key);
    });

    it('falls back to stars', () => {
        expect(programIconKeyForLabel('Κάτι άλλο')).toBe('stars');
        expect(programIconKeyForLabel('')).toBe('stars');
    });
});
