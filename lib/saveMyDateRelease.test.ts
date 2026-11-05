import { describe, expect, it } from 'vitest';

import { SAVE_MY_DATE_LAUNCHED, showsSaveMyDate } from '@/lib/saveMyDateRelease';

describe('showsSaveMyDate', () => {
    it('is not launched yet', () => {
        expect(SAVE_MY_DATE_LAUNCHED).toBe(false);
    });

    it('hides it on the production site', () => {
        expect(showsSaveMyDate({ VERCEL_ENV: 'production' })).toBe(false);
    });

    it('shows it on staging, previews and locally', () => {
        expect(showsSaveMyDate({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toBe(true);
        expect(showsSaveMyDate({ VERCEL_ENV: 'preview' })).toBe(true);
        expect(showsSaveMyDate({})).toBe(true);
    });
});
