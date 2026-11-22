import { describe, expect, it } from 'vitest';

import { showsFeedEditor } from '@/lib/feedEditorRelease';

describe('showsFeedEditor', () => {
    it('is on for staging and previews', () => {
        expect(showsFeedEditor({ VERCEL_ENV: 'preview' })).toBe(true);
        expect(showsFeedEditor({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging' })).toBe(true);
    });

    it('is off on the production site until launched', () => {
        expect(showsFeedEditor({ VERCEL_ENV: 'production' })).toBe(false);
    });
});
