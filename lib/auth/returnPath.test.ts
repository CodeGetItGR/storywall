import { describe, expect, it } from 'vitest';

import { buildReturnPath, getPostAuthRedirectPath, getPostRegisterRedirectPath, getSafeReturnPath } from '@/lib/auth/returnPath';

describe('getSafeReturnPath', () => {
    it('keeps an internal path and its query string', () => {
        expect(getSafeReturnPath('/events/event-1/feed?post=post-1')).toBe('/events/event-1/feed?post=post-1');
    });

    it.each(['https://example.com', '//example.com', 'events/event-1/feed', '/\\example.com'])('rejects an unsafe return path: %s', (path) => {
        expect(getSafeReturnPath(path)).toBeNull();
    });

    it('returns a member to the requested protected path after sign-in', () => {
        expect(getPostAuthRedirectPath('USER', '/events/event-1/feed?post=post-1')).toBe('/events/event-1/feed?post=post-1');
    });

    it('keeps the admin landing page for an administrator', () => {
        expect(getPostAuthRedirectPath('ADMIN', '/events/event-1/feed')).toBe('/admin');
    });
});

describe('buildReturnPath', () => {
    it('joins pathname and search', () => {
        expect(buildReturnPath('/events/new', '?step=plan')).toBe('/events/new?step=plan');
    });

    it('returns the pathname alone when there is no query', () => {
        expect(buildReturnPath('/events/new', '')).toBe('/events/new');
    });
});

describe('getPostRegisterRedirectPath', () => {
    it('sends a new account with no invite to home', () => {
        expect(getPostRegisterRedirectPath('USER', false)).toBe('/home');
    });

    it('sends an invited account to the feed', () => {
        expect(getPostRegisterRedirectPath('USER', true)).toBe('/feed');
    });

    it('keeps the admin landing page for an administrator', () => {
        expect(getPostRegisterRedirectPath('ADMIN', false)).toBe('/admin');
    });
});
