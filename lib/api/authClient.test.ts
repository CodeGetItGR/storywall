import { afterEach, describe, expect, it, vi } from 'vitest';

import { authClient } from '@/lib/api/authClient';
import { rememberVisitSource, type VisitSource } from '@/lib/signupSource';

const SOURCE: VisitSource = { utmSource: 'instagram', utmMedium: 'social', utmCampaign: null, adClick: false, referrerHost: null, landingPage: '/' };

function stubFetch() {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ accessToken: 't' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
    return JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
}

const REGISTER = {
    email: 'a@example.com',
    password: 'password123',
    firstName: 'A',
    lastName: 'B',
    acceptedGuidelinesVersion: 'g',
    acceptedTermsVersion: 't',
    adultConfirmed: true as const,
};

describe('authClient visit source while off', () => {
    it('sends no visitSource even when one is remembered', async () => {
        const fetchMock = stubFetch();
        rememberVisitSource(SOURCE);
        await authClient.register(REGISTER);
        await authClient.oauth('GOOGLE', { idToken: 'id' });
        expect(sentBody(fetchMock)).not.toHaveProperty('visitSource');
        expect(JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))).not.toHaveProperty('visitSource');
    });
});

afterEach(() => {
    rememberVisitSource(null);
    vi.unstubAllGlobals();
});

// Skipped while SEND_VISIT_SOURCE is off in authClient.ts.
describe.skip('authClient visit source', () => {
    it('adds the remembered source to register', async () => {
        const fetchMock = stubFetch();
        rememberVisitSource(SOURCE);
        await authClient.register(REGISTER);
        expect(sentBody(fetchMock).visitSource).toEqual(SOURCE);
    });

    it('adds it to oauth', async () => {
        const fetchMock = stubFetch();
        rememberVisitSource(SOURCE);
        await authClient.oauth('GOOGLE', { idToken: 'id' });
        expect(sentBody(fetchMock).visitSource).toEqual(SOURCE);
    });

    it('sends no visitSource when there is none', async () => {
        const fetchMock = stubFetch();
        await authClient.register(REGISTER);
        expect(sentBody(fetchMock)).not.toHaveProperty('visitSource');
    });
});
