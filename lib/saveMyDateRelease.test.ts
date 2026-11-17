import { describe, expect, it } from 'vitest';

import { SAVE_MY_DATE_LAUNCHED, SAVE_MY_DATE_MODULE_KEY, showsSaveMyDate, withoutUnreleasedModules } from '@/lib/saveMyDateRelease';

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

describe('withoutUnreleasedModules', () => {
    const modules = [{ moduleKey: 'rsvp' }, { moduleKey: SAVE_MY_DATE_MODULE_KEY }, { moduleKey: 'qr_cards' }];

    it('drops the Save my date module on the production site', () => {
        expect(withoutUnreleasedModules(modules, { VERCEL_ENV: 'production' })).toEqual([{ moduleKey: 'rsvp' }, { moduleKey: 'qr_cards' }]);
    });

    it('keeps every module where Save my date shows', () => {
        expect(withoutUnreleasedModules(modules, { VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toEqual(modules);
        expect(withoutUnreleasedModules(modules, {})).toEqual(modules);
    });
});
