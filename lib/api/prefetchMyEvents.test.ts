import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ serverGet: vi.fn() }));

vi.mock('@/lib/api/serverFetch', () => ({ serverGet: mocks.serverGet }));

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { endpoints } from '@/lib/api/endpoints';
import type { EventMemberResponseDto } from '@/lib/api/types';
import type { ServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';

import { prefetchMyEventDetails } from './prefetchMyEvents';

const memberships = [{ eventId: 'event-1' }, { eventId: 'event-2' }, { eventId: 'event-3' }] as EventMemberResponseDto[];
const context: ServerEventContext = { accessToken: 'token-1', memberships, activeEventId: 'event-1', isHost: false };

beforeEach(() => {
    mocks.serverGet.mockReset();
});

describe('prefetchMyEventDetails', () => {
    it('seeds the memberships and every event that loads, even when one fails', async () => {
        mocks.serverGet.mockImplementation(async (path: string) => {
            if (path === endpoints.events.byId('event-2')) throw new Error('Spring is down');
            return { id: path };
        });
        const queryClient = makeQueryClient();

        await prefetchMyEventDetails(queryClient, context);

        expect(queryClient.getQueryData(myEventsKeys.all)).toBe(memberships);
        expect(queryClient.getQueryData(eventKeys.detail('event-1'))).toEqual({ id: endpoints.events.byId('event-1') });
        expect(queryClient.getQueryData(eventKeys.detail('event-2'))).toBeUndefined();
        expect(queryClient.getQueryData(eventKeys.detail('event-3'))).toEqual({ id: endpoints.events.byId('event-3') });
    });
});
