import { describe, expect, it } from 'vitest';

import { saleButtonInScrollRange } from '@/lib/landingSaleButton';

const viewportHeight = 800;

describe('saleButtonInScrollRange', () => {
    it('stays hidden on the first screen', () => {
        expect(saleButtonInScrollRange({ scrollY: 799, viewportHeight, pricingTop: 3000 })).toBe(false);
    });

    it('shows between the first screen and the plans', () => {
        expect(saleButtonInScrollRange({ scrollY: 800, viewportHeight, pricingTop: 3000 })).toBe(true);
    });

    it('hides once the plans come into view and stays hidden past them', () => {
        expect(saleButtonInScrollRange({ scrollY: 2000, viewportHeight, pricingTop: 800 })).toBe(false);
        expect(saleButtonInScrollRange({ scrollY: 5000, viewportHeight, pricingTop: -2000 })).toBe(false);
    });

    it('stays hidden while the page has no plans to go to', () => {
        expect(saleButtonInScrollRange({ scrollY: 2000, viewportHeight, pricingTop: null })).toBe(false);
    });
});
