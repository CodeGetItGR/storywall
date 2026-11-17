import { describe, expect, it } from 'vitest';

import { isValidIban, maskIban } from '@/lib/giftAccount';

describe('isValidIban', () => {
    it('accepts valid check digits, with or without spaces', () => {
        expect(isValidIban('DE89370400440532013000')).toBe(true);
        expect(isValidIban('gr16 0110 1250 0000 0001 2300 695')).toBe(true);
    });

    it('rejects wrong check digits and malformed values', () => {
        expect(isValidIban('DE00370400440532013000')).toBe(false);
        expect(isValidIban('not an iban')).toBe(false);
    });
});

describe('maskIban', () => {
    it('keeps the country, check digits and last four', () => {
        expect(maskIban('DE89 3704 0044 0532 0130 00')).toBe('DE89 •••• 3000');
    });
});
