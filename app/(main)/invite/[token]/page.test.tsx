import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fullPageLoad: true,
    serverPublicGet: vi.fn(),
}));

vi.mock('@/lib/auth/serverEventContext', () => ({ isFullPageLoad: async () => mocks.fullPageLoad }));
vi.mock('@/lib/api/serverFetch', () => ({ serverPublicGet: mocks.serverPublicGet }));
vi.mock('@/lib/shareMetadata', () => ({ inviteShareMetadata: vi.fn() }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const PREVIEW = { inviteToken: 'tok-1', eventId: 'e1', expired: false, alreadyUsed: false };

function visit() {
    return Page({ params: Promise.resolve({ token: 'tok-1' }) });
}

function seeded(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => [query.queryKey, query.state.data]);
}

describe('InvitePage (server)', () => {
    beforeEach(() => {
        mocks.fullPageLoad = true;
        mocks.serverPublicGet.mockReset().mockResolvedValue(PREVIEW);
    });

    it('seeds the invite on an opened link', async () => {
        expect(seeded(await visit())).toEqual([[['event-invitations', 'tok-1', 'preview'], PREVIEW]]);
        expect(mocks.serverPublicGet).toHaveBeenCalledWith('/api/event-invitations/tok-1/preview');
    });

    it("leaves an in-app navigation to the client's cache", async () => {
        mocks.fullPageLoad = false;

        expect(seeded(await visit())).toEqual([]);
        expect(mocks.serverPublicGet).not.toHaveBeenCalled();
    });

    it('still renders when the lookup fails', async () => {
        mocks.serverPublicGet.mockRejectedValue(new Error('Server prefetch failed'));

        expect(seeded(await visit())).toEqual([]);
    });
});
