import { describe, expect, it } from 'vitest';

import { analyticsPageLocation, analyticsPageReferrer } from '@/lib/googleAnalytics';

describe('analyticsPageLocation', () => {
    it('reports the route instead of ids in the path', () => {
        expect(analyticsPageLocation('https://storywall.gr/events/evt-1/checkout/success', { eventId: 'evt-1' })).toBe(
            'https://storywall.gr/events/[eventId]/checkout/success',
        );
    });

    it('keeps campaign parameters and drops the rest', () => {
        expect(analyticsPageLocation('https://storywall.gr/?utm_source=google&session_id=cs_1&gclid=abc', {})).toBe(
            'https://storywall.gr/?utm_source=google&gclid=abc',
        );
    });
});

describe('analyticsPageReferrer', () => {
    it('cuts a referrer on this site to its origin', () => {
        expect(analyticsPageReferrer('https://storywall.gr/invite/secret-token', 'https://storywall.gr')).toBe('https://storywall.gr');
    });

    it('keeps another site and an empty referrer as they are', () => {
        expect(analyticsPageReferrer('https://www.google.com/', 'https://storywall.gr')).toBe('https://www.google.com/');
        expect(analyticsPageReferrer('', 'https://storywall.gr')).toBe('');
    });
});
