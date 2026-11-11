import { describe, expect, it } from 'vitest';

import { showsCheckoutCelebration } from '@/lib/checkoutCelebration';

describe('showsCheckoutCelebration', () => {
    it("celebrates a paid draft's activation when the wizard is on", () => {
        expect(showsCheckoutCelebration(true, { kind: 'ACTIVATION' })).toBe(true);
    });

    it("keeps today's page for upgrades, extensions and storage packs", () => {
        expect(showsCheckoutCelebration(true, { kind: 'UPGRADE' })).toBe(false);
        expect(showsCheckoutCelebration(true, { kind: 'EXTENSION' })).toBe(false);
        expect(showsCheckoutCelebration(true, { kind: 'STORAGE_PACK' })).toBe(false);
    });

    it('waits for the payment', () => {
        expect(showsCheckoutCelebration(true, null)).toBe(false);
    });

    it('stays off with the flag off', () => {
        expect(showsCheckoutCelebration(false, { kind: 'ACTIVATION' })).toBe(false);
    });
});
