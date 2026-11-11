import { describe, expect, it } from 'vitest';

import { showsCreateWizard, showsUnlaunchedOccasions, showsUnreleasedPages } from '@/lib/unreleasedPages';

describe('showsUnreleasedPages', () => {
    it('hides them on the production site', () => {
        expect(showsUnreleasedPages({ VERCEL_ENV: 'production' }, false)).toBe(false);
    });

    it('shows them on staging, previews and locally', () => {
        expect(showsUnreleasedPages({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' }, false)).toBe(true);
        expect(showsUnreleasedPages({ VERCEL_ENV: 'preview' }, false)).toBe(true);
        expect(showsUnreleasedPages({}, false)).toBe(true);
    });

    it('shows them on the production site once launched', () => {
        expect(showsUnreleasedPages({ VERCEL_ENV: 'production' }, true)).toBe(true);
    });
});

describe('showsUnlaunchedOccasions', () => {
    it('hides them on the production site', () => {
        expect(showsUnlaunchedOccasions({ VERCEL_ENV: 'production' })).toBe(false);
    });

    it('shows them on staging, previews and locally', () => {
        expect(showsUnlaunchedOccasions({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toBe(true);
        expect(showsUnlaunchedOccasions({ VERCEL_ENV: 'preview' })).toBe(true);
        expect(showsUnlaunchedOccasions({})).toBe(true);
    });
});

describe('showsCreateWizard', () => {
    it('keeps the old create flow on the production site', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production' }, false)).toBe(false);
    });

    it('shows the wizard on staging, previews and locally', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' }, false)).toBe(true);
        expect(showsCreateWizard({ VERCEL_ENV: 'preview' }, false)).toBe(true);
        expect(showsCreateWizard({}, false)).toBe(true);
    });

    it('shows it on the production site once launched', () => {
        expect(showsCreateWizard({ VERCEL_ENV: 'production' }, true)).toBe(true);
    });
});
