import { describe, expect, it } from 'vitest';

import { FOR_BUSINESS_HUB_LAUNCHED, showsForBusinessHub } from '@/lib/forBusinessRelease';

describe('showsForBusinessHub', () => {
    it('is not launched yet', () => {
        expect(FOR_BUSINESS_HUB_LAUNCHED).toBe(false);
    });

    it('hides it on the production site', () => {
        expect(showsForBusinessHub({ VERCEL_ENV: 'production' })).toBe(false);
    });

    it('shows it on staging, previews and locally', () => {
        expect(showsForBusinessHub({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toBe(true);
        expect(showsForBusinessHub({ VERCEL_ENV: 'preview' })).toBe(true);
        expect(showsForBusinessHub({})).toBe(true);
    });
});
