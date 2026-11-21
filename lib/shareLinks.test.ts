import { describe, expect, it } from 'vitest';

import { switchedShareLocaleUrl } from '@/lib/shareLinks';

describe('switchedShareLocaleUrl', () => {
    it('sets the new language on a shared link that names one', () => {
        expect(switchedShareLocaleUrl('https://storywall.gr/q/abc?lang=el', 'en')).toBe('https://storywall.gr/q/abc?lang=en');
        expect(switchedShareLocaleUrl('https://storywall.gr/invite/xyz?lang=en&x=1#top', 'el')).toBe('https://storywall.gr/invite/xyz?lang=el&x=1#top');
    });

    it('returns null for a shared link without a language', () => {
        expect(switchedShareLocaleUrl('https://storywall.gr/q/abc', 'en')).toBeNull();
    });

    it('returns null for other pages', () => {
        expect(switchedShareLocaleUrl('https://storywall.gr/events?lang=el', 'en')).toBeNull();
    });
});
