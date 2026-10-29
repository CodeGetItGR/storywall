import { describe, expect, it } from 'vitest';

import type { SiteNoticeLiveDto } from '@/lib/api/types';
import { dismissalKey, pickSiteNotice, siteNoticeAreaFor } from '@/lib/siteNotices';

function notice(overrides: Partial<SiteNoticeLiveDto>): SiteNoticeLiveDto {
    return {
        id: 'n1',
        version: 1,
        tone: 'INFO',
        message: { en: 'Hello', el: 'Γεια' },
        linkUrl: null,
        linkLabel: {},
        areas: ['EVERYWHERE'],
        dismissible: true,
        startsAt: null,
        createdAt: '2026-10-01T00:00:00Z',
        ...overrides,
    };
}

const NONE = new Set<string>();

describe('pickSiteNotice', () => {
    it('shows nothing where notices are hidden', () => {
        expect(pickSiteNotice([notice({})], null, NONE)).toBeNull();
    });

    it('matches the viewer area, and EVERYWHERE matches every area', () => {
        const offer = notice({ id: 'offer', areas: ['PUBLIC', 'HOST'] });
        expect(pickSiteNotice([offer], 'GUEST', NONE)).toBeNull();
        expect(pickSiteNotice([offer], 'HOST', NONE)?.id).toBe('offer');
        expect(pickSiteNotice([notice({ id: 'all' })], 'ADMIN', NONE)?.id).toBe('all');
    });

    it('shows only EVERYWHERE notices while the event role is unknown', () => {
        const hostOnly = notice({ id: 'host', tone: 'CRITICAL', areas: ['HOST'] });
        const all = notice({ id: 'all' });
        expect(pickSiteNotice([hostOnly, all], 'PENDING', NONE)?.id).toBe('all');
    });

    it('ranks by tone, then by the newest start (or creation)', () => {
        const info = notice({ id: 'info', tone: 'INFO', createdAt: '2026-10-20T00:00:00Z' });
        const olderWarning = notice({ id: 'old', tone: 'WARNING', createdAt: '2026-10-01T00:00:00Z' });
        const newerWarning = notice({ id: 'new', tone: 'WARNING', createdAt: '2026-09-01T00:00:00Z', startsAt: '2026-10-10T00:00:00Z' });
        expect(pickSiteNotice([info, olderWarning, newerWarning], 'PUBLIC', NONE)?.id).toBe('new');
        expect(pickSiteNotice([info, notice({ id: 'crit', tone: 'CRITICAL' })], 'PUBLIC', NONE)?.id).toBe('crit');
    });

    it('skips a dismissed version but shows an edited one, and never skips a notice that cannot be closed', () => {
        const closable = notice({ id: 'a', version: 2 });
        expect(pickSiteNotice([closable], 'PUBLIC', new Set(['a:2']))).toBeNull();
        expect(pickSiteNotice([closable], 'PUBLIC', new Set(['a:1']))?.id).toBe('a');
        const locked = notice({ id: 'b', dismissible: false });
        expect(pickSiteNotice([locked], 'PUBLIC', new Set(['b:1']))?.id).toBe('b');
    });

    it('falls through to the next notice when the top one is dismissed', () => {
        const top = notice({ id: 'top', tone: 'WARNING' });
        const next = notice({ id: 'next', tone: 'OFFER' });
        expect(pickSiteNotice([top, next], 'PUBLIC', new Set([dismissalKey(top)]))?.id).toBe('next');
    });
});

describe('siteNoticeAreaFor', () => {
    const base = { isSignedIn: true, isAuthLoading: false, routeEventId: null, isHost: false, isEventLoading: false };

    it('hides the bar in the demo', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/demo/wedding' })).toBeNull();
    });

    it('uses ADMIN for the console', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/admin' })).toBe('ADMIN');
    });

    it('uses the event role on event pages, PENDING while it loads', () => {
        const event = { ...base, pathname: '/events/e1/feed', routeEventId: 'e1' };
        expect(siteNoticeAreaFor({ ...event, isHost: true })).toBe('HOST');
        expect(siteNoticeAreaFor(event)).toBe('GUEST');
        expect(siteNoticeAreaFor({ ...event, isEventLoading: true })).toBe('PENDING');
    });

    it('shows only EVERYWHERE notices on a post page, whose event the URL does not name', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/post/p1' })).toBe('PENDING');
    });

    it('uses HOST on the signed-in app pages without an event', () => {
        for (const pathname of ['/home', '/profile', '/notifications', '/feed', '/events/new']) {
            expect(siteNoticeAreaFor({ ...base, pathname })).toBe('HOST');
        }
    });

    it('treats the invite page as GUEST when signed in and PUBLIC otherwise', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/invite/abc' })).toBe('GUEST');
        expect(siteNoticeAreaFor({ ...base, isSignedIn: false, pathname: '/invite/abc' })).toBe('PUBLIC');
    });

    it('shows only EVERYWHERE notices while sign-in is unknown, on pages whose area depends on it', () => {
        const loading = { ...base, isSignedIn: false, isAuthLoading: true };
        for (const pathname of ['/home', '/invite/abc', '/post/p1']) {
            expect(siteNoticeAreaFor({ ...loading, pathname })).toBe('PENDING');
        }
        expect(siteNoticeAreaFor({ ...loading, pathname: '/events/e1/feed', routeEventId: 'e1' })).toBe('PENDING');
        expect(siteNoticeAreaFor({ ...loading, pathname: '/login' })).toBe('PUBLIC');
        expect(siteNoticeAreaFor({ ...loading, pathname: '/admin' })).toBe('ADMIN');
    });

    it('uses PUBLIC everywhere else, and for signed-out visitors on app paths', () => {
        expect(siteNoticeAreaFor({ ...base, pathname: '/legal/terms' })).toBe('PUBLIC');
        expect(siteNoticeAreaFor({ ...base, pathname: '/login' })).toBe('PUBLIC');
        expect(siteNoticeAreaFor({ ...base, isSignedIn: false, pathname: '/home' })).toBe('PUBLIC');
    });
});
