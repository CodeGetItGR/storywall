import { describe, expect, it } from 'vitest';

import { SHOP_LAUNCHED, showsShop } from '@/lib/shopRelease';

describe('showsShop', () => {
    it('is not launched yet', () => {
        expect(SHOP_LAUNCHED).toBe(false);
    });

    it('hides it on the production site', () => {
        expect(showsShop({ VERCEL_ENV: 'production' })).toBe(false);
    });

    it('shows it on staging, previews and locally', () => {
        expect(showsShop({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toBe(true);
        expect(showsShop({ VERCEL_ENV: 'preview' })).toBe(true);
        expect(showsShop({})).toBe(true);
    });
});
