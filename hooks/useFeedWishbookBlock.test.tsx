import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedWishbookBlock } from '@/hooks/useFeedWishbookBlock';
import type { EventDetailResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({ isHost: false, member: { id: 'm1' } as object | null, demoBuilder: false }));
const calls = vi.hoisted(() => ({ all: [] as (string | null)[], mine: [] as (string | null)[] }));

const page = (ids: string[], total: number) => ({
    data: { pages: [{ content: ids.map((id) => ({ id })), page: { totalElements: total } }] },
    isLoading: false,
});

vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => state.isHost, useActiveMember: () => state.member }));
vi.mock('@/hooks/useContentAccess', () => ({ useContentAccess: () => ({ isDemoBuilder: state.demoBuilder }) }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => () => ({ name: 'Wishbook' }) }));
vi.mock('@/hooks/useWishbook', () => ({
    useWishbook: (eventId: string | null) => {
        calls.all.push(eventId);
        return page(['a', 'b', 'c', 'd', 'e', 'f'], 18);
    },
    useMyWishes: (eventId: string | null) => {
        calls.mine.push(eventId);
        return page(['m'], 1);
    },
}));

const event = (status: 'ACTIVE' | 'DRAFT' = 'ACTIVE') => ({ id: 'e1', eventType: 'WEDDING', status }) as EventDetailResponseDto;

beforeEach(() => {
    state.isHost = false;
    state.member = { id: 'm1' };
    state.demoBuilder = false;
    calls.all = [];
    calls.mine = [];
});

describe('useFeedWishbookBlock', () => {
    it("gives a host everyone's five newest wishes, the full count and no Write button", () => {
        state.isHost = true;
        const { result } = renderHook(() => useFeedWishbookBlock(event(), true));
        expect(calls.all.at(-1)).toBe('e1');
        expect(calls.mine.at(-1)).toBeNull();
        expect(result.current.wishes.map((wish) => wish.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(result.current).toMatchObject({ total: 18, writeHref: null, listHref: '/events/e1/tools/wishbook' });
    });

    it('gives a guest only their own wishes, the Write button and the link to their list', () => {
        const { result } = renderHook(() => useFeedWishbookBlock(event(), true));
        expect(calls.all.at(-1)).toBeNull();
        expect(calls.mine.at(-1)).toBe('e1');
        expect(result.current).toMatchObject({
            total: 1,
            writeHref: '/events/e1/tools/wishbook',
            listHref: '/events/e1/tools/wishbook#my-wishes-title',
        });
    });

    it('has no Write button on an event that takes no wishes now', () => {
        expect(renderHook(() => useFeedWishbookBlock(event('DRAFT'), true)).result.current.writeHref).toBeNull();
    });

    it('lets an admin building the demo write as the host', () => {
        state.isHost = true;
        state.demoBuilder = true;
        expect(renderHook(() => useFeedWishbookBlock(event(), true)).result.current.writeHref).toBe('/events/e1/tools/wishbook');
    });

    it('reads nothing once the module is gone', () => {
        const { result } = renderHook(() => useFeedWishbookBlock(event(), false));
        expect(calls.mine.at(-1)).toBeNull();
        expect(result.current.writeHref).toBeNull();
    });
});
