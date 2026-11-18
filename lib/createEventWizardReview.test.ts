import { describe, expect, it } from 'vitest';

import { dueAtActivation, joinLine, planRowDetail, previewWhen } from '@/lib/createEventWizardReview';

const copy = {
    guestsUpTo: (count: number) => `Up to ${count} guests`,
    guestsUnlimited: 'Unlimited guests',
    storageUnlimited: 'Unlimited storage',
};

describe('dueAtActivation', () => {
    it('uses the code preview when a code is applied', () => {
        expect(dueAtActivation({ amountMinor: 9900, currency: 'EUR' }, { payableAmountMinor: 4950, currency: 'EUR' }, 'EUR')).toEqual({
            amountMinor: 4950,
            currency: 'EUR',
        });
    });

    it('uses the plan price without a code', () => {
        expect(dueAtActivation({ amountMinor: 9900, currency: 'EUR' }, null, 'EUR')).toEqual({ amountMinor: 9900, currency: 'EUR' });
    });

    it('is zero in the plan currency when nothing is charged', () => {
        expect(dueAtActivation(null, null, 'EUR')).toEqual({ amountMinor: 0, currency: 'EUR' });
    });
});

describe('previewWhen', () => {
    it('is empty without a start', () => {
        expect(previewWhen('en', '')).toBe('');
    });

    it('shows the date and time as typed', () => {
        const line = previewWhen('en', '2027-06-12T18:00');
        expect(line).toContain('2027');
        expect(line).toContain(' · ');
        expect(line).toMatch(/6:00|18:00/);
    });
});

describe('joinLine', () => {
    it('joins the parts that have text with a middle dot', () => {
        expect(joinLine(['Sat 12 June 2027', '', null, 'Agios Nikolaos'])).toBe('Sat 12 June 2027 · Agios Nikolaos');
    });
});

describe('planRowDetail', () => {
    it('names the guests and the storage', () => {
        expect(planRowDetail({ maxMembers: 300, storageBytes: 25 * 1024 ** 3 }, copy)).toMatch(/^Up to 300 guests · 25/);
    });

    it('says unlimited when a limit is null', () => {
        expect(planRowDetail({ maxMembers: null, storageBytes: null }, copy)).toBe('Unlimited guests · Unlimited storage');
    });
});
