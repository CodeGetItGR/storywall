import { describe, expect, it } from 'vitest';

import { buildReturnPath, getPostAuthRedirectPath, getPostRegisterRedirectPath, getSafeReturnPath, withLocationHash } from '@/lib/auth/returnPath';

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
        expect(getPostAuthRedirectPath('ADMIN', null)).toBe('/admin');
    });

    it('returns an administrator to the console section they asked for', () => {
        expect(getPostAuthRedirectPath('ADMIN', '/admin#phones')).toBe('/admin#phones');
        expect(getPostAuthRedirectPath('ADMIN', '/admin#orders/abc')).toBe('/admin#orders/abc');
    });

    it.each(['/admin', '/admin?section=plans', '/admin/plans'])('sends a member to the feed instead of an admin return path: %s', (path) => {
        expect(getPostAuthRedirectPath('USER', path)).toBe('/feed');
    });

    it('returns marketing to the console section they asked for, and signs them in like a member otherwise', () => {
        expect(getPostAuthRedirectPath('MARKETING', '/admin#outreach/abc')).toBe('/admin#outreach/abc');
        expect(getPostAuthRedirectPath('MARKETING', '/events/event-1/feed')).toBe('/events/event-1/feed');
        expect(getPostAuthRedirectPath('MARKETING', null)).toBe('/feed');
    });

    it('keeps a return path that only starts with the admin prefix', () => {
        expect(getPostAuthRedirectPath('USER', '/administrator')).toBe('/administrator');
    });
});

describe('withLocationHash', () => {
    it("adds the page's hash to the return path", () => {
        expect(withLocationHash('/admin', '#phones')).toBe('/admin#phones');
        expect(withLocationHash('/events/event-1/feed?post=post-1', '#comments')).toBe('/events/event-1/feed?post=post-1#comments');
    });

    it('keeps a return path that has its own hash', () => {
        expect(withLocationHash('/admin#orders', '#phones')).toBe('/admin#orders');
    });

    it.each(['', '#'])('leaves the return path alone without a hash: %j', (hash) => {
        expect(withLocationHash('/admin', hash)).toBe('/admin');
    });

    it('stays empty without a return path', () => {
        expect(withLocationHash(null, '#phones')).toBeNull();
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

    it("sends an invited account to the invited event's feed", () => {
        expect(getPostRegisterRedirectPath('USER', true, '/events/event-1/feed')).toBe('/events/event-1/feed');
    });

    it('ignores the return path without an invite', () => {
        expect(getPostRegisterRedirectPath('USER', false, '/events/event-1/feed')).toBe('/home');
    });

    it('keeps the admin landing page for an administrator', () => {
        expect(getPostRegisterRedirectPath('ADMIN', false)).toBe('/admin');
    });
});
