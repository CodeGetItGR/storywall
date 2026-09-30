// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_IP_HEADER, CLIENT_IP_SECRET_HEADER, clientIpFrom, springAuth } from './springAuth';

const fetchMock = vi.fn();

beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ accessToken: 'at' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

function sentHeaders(): Record<string, string> {
    return fetchMock.mock.calls[0][1].headers as Record<string, string>;
}

describe('springAuth client address forwarding', () => {
    // Every call here reaches Spring from this server's address, so without the browser's own
    // address all sign-ups on the platform share one rate-limit budget.
    it('forwards the browser address with the shared secret', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 'shh');

        await springAuth.login({ email: 'a@b.c', password: 'pw' }, 'en', '198.51.100.7');

        expect(sentHeaders()).toMatchObject({ [CLIENT_IP_HEADER]: '198.51.100.7', [CLIENT_IP_SECRET_HEADER]: 'shh' });
    });

    it('sends neither header when no secret is configured', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', '');

        await springAuth.register({ email: 'a@b.c', password: 'pw' } as never, 'en', '198.51.100.7');

        expect(sentHeaders()).not.toHaveProperty(CLIENT_IP_HEADER);
        expect(sentHeaders()).not.toHaveProperty(CLIENT_IP_SECRET_HEADER);
    });

    it('sends neither header when the browser address is unknown', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 'shh');

        await springAuth.refresh('rt', 'en', null);

        expect(sentHeaders()).not.toHaveProperty(CLIENT_IP_HEADER);
        expect(sentHeaders()).not.toHaveProperty(CLIENT_IP_SECRET_HEADER);
    });
});

describe('clientIpFrom', () => {
    it('takes the first x-forwarded-for entry', () => {
        expect(clientIpFrom(new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' }))).toBe('198.51.100.7');
    });

    it('falls back to x-real-ip', () => {
        expect(clientIpFrom(new Headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
    });

    it('is null when neither is present', () => {
        expect(clientIpFrom(new Headers())).toBeNull();
    });
});
