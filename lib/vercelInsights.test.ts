import { describe, expect, it } from 'vitest';

import { pageRoute, redactPageviewUrl, redactVitalUrl } from '@/lib/vercelInsights';

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

describe('redactPageviewUrl', () => {
    it('reports a tokenized page under its route', () => {
        const event = { type: 'pageview', url: 'https://example.com/invite/secret-token' };

        expect(redactPageviewUrl(event, { token: 'secret-token' })).toEqual({ ...event, url: 'https://example.com/invite/[token]' });
    });

    it('drops the query and the hash', () => {
        const event = { type: 'pageview', url: 'https://example.com/verify-email?token=secret#top' };

        expect(redactPageviewUrl(event, {}).url).toBe('https://example.com/verify-email');
    });
});

describe('pageRoute', () => {
    it('names every dynamic segment', () => {
        expect(pageRoute('/events/e1/tools/gifts/g1', { eventId: 'e1', giftId: 'g1' })).toBe('/events/[eventId]/tools/gifts/[giftId]');
    });

    it('names a catch-all across its segments', () => {
        expect(pageRoute('/events/e1/location/host/edit', { eventId: 'e1', role: ['host', 'edit'] })).toBe('/events/[eventId]/location/[...role]');
    });

    it('matches a param against its encoded spelling', () => {
        expect(pageRoute('/q/a%20b', { code: 'a b' })).toBe('/q/[code]');
    });

    it('only replaces a whole segment', () => {
        expect(pageRoute('/feedback/feed', { slug: 'feed' })).toBe('/feedback/[slug]');
    });

    it('leaves a page without params as is', () => {
        expect(pageRoute('/pricing', {})).toBe('/pricing');
    });
});
