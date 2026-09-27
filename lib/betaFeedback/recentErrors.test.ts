import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, clearRecentErrors, getRecentErrors, recordFailedCall } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AuthSessionDto } from '@/lib/api/types';
import { setSession } from '@/lib/auth/tokenStore';
import { redactApiPath, toRouteTemplate } from '@/lib/betaFeedback/routeTemplates';

const TOKEN = 'SeCrEt-Token_123';

function problem(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/problem+json' } });
}

describe('redactApiPath', () => {
    it.each([
        [`/api/qr/${TOKEN}`, '/api/qr/:token'],
        [`/api/qr/${TOKEN}/media`, '/api/qr/:token/media'],
        [`/api/qr/${TOKEN}/media/batch`, '/api/qr/:token/media/batch'],
        [`/api/event-invitations/${TOKEN}/preview`, '/api/event-invitations/:inviteToken/preview'],
        [`/api/event-invitations/${TOKEN}/accept`, '/api/event-invitations/:inviteToken/accept'],
        [`/api/partners/${TOKEN}`, '/api/partners/:token'],
        [`/api/events/e1/stream?token=${TOKEN}`, '/api/events/e1/stream'],
        ['/api/events/e1/posts#top', '/api/events/e1/posts'],
    ])('%s → %s', (input, expected) => {
        expect(redactApiPath(input)).toBe(expected);
    });

    it('keeps an invitation read by id', () => {
        expect(redactApiPath('/api/event-invitations/abc')).toBe('/api/event-invitations/abc');
    });
});

describe('toRouteTemplate', () => {
    it('replaces every param segment with a :placeholder', () => {
        expect(toRouteTemplate(`/q/${TOKEN}`, { token: TOKEN })).toBe('/q/:token');
        expect(toRouteTemplate('/events/e-1/tools/gallery', { eventId: 'e-1' })).toBe('/events/:eventId/tools/gallery');
        expect(toRouteTemplate('/demo/location/host/x', { role: ['host', 'x'] })).toBe('/demo/location/:role/:role');
    });

    it('matches an encoded segment and drops the query', () => {
        expect(toRouteTemplate('/invite/a%20b?next=1', { token: 'a b' })).toBe('/invite/:token');
    });

    it('never uses braces or brackets', () => {
        expect(toRouteTemplate(`/partners/${TOKEN}`, { token: TOKEN })).not.toMatch(/[{}[\]]/);
    });
});

describe('recent errors ring buffer', () => {
    beforeEach(() => {
        clearRecentErrors();
        setSession({ accessToken: 'access', userId: 'u1' } as AuthSessionDto);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('records a failed call with a token-free path and the 500 errorRef', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(problem(500, { errorCode: 9001, errorRef: 'a1b2c3d4e5f6' })));

        await expect(api.publicGet(`/api/qr/${TOKEN}`)).rejects.toMatchObject({ status: 500 });

        const [entry] = getRecentErrors();
        expect(entry).toMatchObject({ method: 'GET', path: '/api/qr/:token', status: 500, errorCode: 9001, errorRef: 'a1b2c3d4e5f6' });
        expect(new Date(entry.at!).toISOString()).toBe(entry.at);
        expect(JSON.stringify(getRecentErrors())).not.toContain(TOKEN);
    });

    it('never stores a token from a multipart QR upload or an invitation accept', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => Promise.resolve(problem(409, { errorCode: 2005 }))),
        );

        await expect(api.publicPostForm(`/api/qr/${TOKEN}/media`, new FormData())).rejects.toBeTruthy();
        await expect(api.post(`/api/event-invitations/${TOKEN}/accept`)).rejects.toBeTruthy();

        expect(getRecentErrors().map((entry) => entry.path)).toEqual(['/api/qr/:token/media', '/api/event-invitations/:inviteToken/accept']);
        expect(JSON.stringify(getRecentErrors())).not.toContain(TOKEN);
    });

    it('keeps only the last 10', () => {
        for (let i = 0; i < 13; i++) recordFailedCall('GET', `/api/events/${i}`, 404, null);
        const paths = getRecentErrors().map((entry) => entry.path);
        expect(paths).toHaveLength(10);
        expect(paths[0]).toBe('/api/events/3');
        expect(paths[9]).toBe('/api/events/12');
    });

    it('drops string error codes, malformed refs and unknown methods', () => {
        recordFailedCall('PROPFIND', '/api/me', 401, { errorCode: 'AUTHENTICATION_REQUIRED', errorRef: 'NOT-A-REF' });
        expect(getRecentErrors()[0]).toMatchObject({ method: null, errorCode: null, errorRef: null, status: 401 });
    });

    it('does not record the report endpoints themselves', () => {
        recordFailedCall('POST', endpoints.betaFeedback.bugReports, 429, null);
        recordFailedCall('POST', endpoints.betaFeedback.clientErrors, 429, null);
        expect(getRecentErrors()).toEqual([]);
    });
});
