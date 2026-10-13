import { describe, expect, it } from 'vitest';

import { showsUnreleasedPages } from '@/lib/unreleasedPages';

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
