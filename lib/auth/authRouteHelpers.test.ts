// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rejectCrossSiteRequest, rejectNonJsonBody } from './authRouteHelpers';

function post(headers: Record<string, string>) {
    return new Request('https://storywall.test/api/auth/login', { method: 'POST', headers, body: '{}' });
}

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('rejectCrossSiteRequest', () => {
    it('lets a same-origin request through', () => {
        expect(rejectCrossSiteRequest(post({ 'sec-fetch-site': 'same-origin' }))).toBeNull();
    });

    // A sibling subdomain is same-site, and could be anyone's.
    it.each(['same-site', 'cross-site', 'none'])('refuses Sec-Fetch-Site: %s', (fetchSite) => {
        const res = rejectCrossSiteRequest(post({ 'sec-fetch-site': fetchSite, origin: 'https://storywall.test', host: 'storywall.test' }));
        expect(res?.status).toBe(403);
    });

    it('falls back to Origin when the browser sends no Sec-Fetch-Site', () => {
        expect(rejectCrossSiteRequest(post({ origin: 'https://storywall.test', host: 'storywall.test' }))).toBeNull();
    });

    it('compares Origin with the forwarded host when there is one', () => {
        const req = post({ origin: 'https://www.storywall.gr', host: 'internal.vercel.app', 'x-forwarded-host': 'www.storywall.gr' });
        expect(rejectCrossSiteRequest(req)).toBeNull();
    });

    it.each([
        ['another site', 'https://evil.test'],
        ['a sibling subdomain', 'https://evil.storywall.test'],
        ['another port', 'https://storywall.test:8443'],
        ['an opaque origin', 'null'],
    ])('refuses an Origin from %s', (_label, origin) => {
        expect(rejectCrossSiteRequest(post({ origin, host: 'storywall.test' }))?.status).toBe(403);
    });

    it('refuses a request with neither Sec-Fetch-Site nor Origin', () => {
        expect(rejectCrossSiteRequest(post({ host: 'storywall.test' }))?.status).toBe(403);
    });

    it('answers in the ProblemDetail shape the client already reads', async () => {
        const res = rejectCrossSiteRequest(post({ 'sec-fetch-site': 'cross-site' }))!;
        expect(res.headers.get('content-type')).toContain('application/problem+json');
        expect(await res.json()).toMatchObject({ status: 403, errorCode: 'ACCESS_DENIED', instance: '/api/auth/login' });
    });
});

describe('rejectNonJsonBody', () => {
    it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])('accepts %s', (contentType) => {
        expect(rejectNonJsonBody(post({ 'content-type': contentType }))).toBeNull();
    });

    // The three a plain HTML form can send without a preflight.
    it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x'])('refuses %s with 415', async (contentType) => {
        const res = rejectNonJsonBody(post({ 'content-type': contentType }))!;
        expect(res.status).toBe(415);
        expect(await res.json()).toMatchObject({ status: 415, errorCode: 3002 });
    });

    it('refuses a body with no Content-Type', () => {
        const req = new Request('https://storywall.test/api/auth/login', { method: 'POST', body: new Blob(['{}']) });
        expect(req.headers.get('content-type')).toBeNull();
        expect(rejectNonJsonBody(req)?.status).toBe(415);
    });
});
