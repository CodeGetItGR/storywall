import { describe, expect, it } from 'vitest';

import { redactVitalUrl } from '@/lib/speedInsights';

describe('redactVitalUrl', () => {
    it('reports a tokenized page under its route', () => {
        const event = { type: 'vital', url: 'https://example.com/invite/secret-token', route: '/invite/[token]' };

        expect(redactVitalUrl(event)).toEqual({ ...event, url: 'https://example.com/invite/[token]' });
    });

    it('drops the query', () => {
        const event = { type: 'vital', url: 'https://example.com/reset-password?token=secret', route: '/reset-password' };

        expect(redactVitalUrl(event)?.url).toBe('https://example.com/reset-password');
    });

    it("doesn't send a vital without a route", () => {
        expect(redactVitalUrl({ type: 'vital', url: 'https://example.com/q/secret' })).toBeNull();
    });
});
