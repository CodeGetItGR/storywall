import { describe, expect, it } from 'vitest';

import type { UserResponseDto } from '@/lib/api/types';

import { accessTokenExpiresInMs, sessionFromProfile } from './sessionHandoff';

function base64Url(value: unknown): string {
    return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwt(claims: Record<string, unknown>): string {
    return `${base64Url({ alg: 'HS256' })}.${base64Url(claims)}.signature`;
}

describe('accessTokenExpiresInMs', () => {
    const now = Date.UTC(2026, 9, 4, 12, 0, 0);

    it('reads the time left from the exp claim', () => {
        const token = jwt({ sub: 'user-1', exp: now / 1000 + 300 });

        expect(accessTokenExpiresInMs(token, now)).toBe(300_000);
    });

    it('is negative once the token has expired', () => {
        const token = jwt({ sub: 'user-1', exp: now / 1000 - 5 });

        expect(accessTokenExpiresInMs(token, now)).toBe(-5_000);
    });

    it('decodes claims whose base64url uses - and _', () => {
        // "~~~" and "???" encode to base64 with + and /, which base64url swaps for - and _.
        const token = jwt({ name: '~~~???', exp: now / 1000 + 60 });

        expect(token.split('.')[1]).toMatch(/[-_]/);
        expect(accessTokenExpiresInMs(token, now)).toBe(60_000);
    });

    it.each([
        ['no exp claim', jwt({ sub: 'user-1' })],
        ['a non-numeric exp', jwt({ exp: 'soon' })],
        ['not a JWT', 'opaque-token'],
        ['an unreadable payload', 'header.%%%.signature'],
        ['a payload that is not an object', `header.${base64Url(42)}.signature`],
    ])('returns null for %s', (_label, token) => {
        expect(accessTokenExpiresInMs(token, now)).toBeNull();
    });
});

describe('sessionFromProfile', () => {
    it('builds the session the browser would get from /api/auth/session', () => {
        const profile = {
            id: 'user-1',
            email: 'host@example.test',
            emailVerified: true,
            firstName: 'Host',
            lastName: 'Test',
            profilePictureUrl: 'https://cdn.example.test/me.jpg',
            authProvider: 'LOCAL',
            isGuestAccount: false,
            status: 'ACTIVE',
            platformRole: 'ADMIN',
            createdAt: '2026-09-01T00:00:00Z',
        } as UserResponseDto;

        expect(sessionFromProfile('token-1', profile)).toEqual({
            accessToken: 'token-1',
            userId: 'user-1',
            email: 'host@example.test',
            role: 'ADMIN',
            firstName: 'Host',
            lastName: 'Test',
            profilePictureUrl: 'https://cdn.example.test/me.jpg',
            authProvider: 'LOCAL',
            isGuestAccount: false,
            status: 'ACTIVE',
            createdAt: '2026-09-01T00:00:00Z',
        });
    });
});
