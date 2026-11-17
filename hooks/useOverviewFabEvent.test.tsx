import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOverviewFabEvent } from '@/hooks/useOverviewFabEvent';

const posts = { moduleKey: 'posts', isEnabled: true, isAvailable: true };
const liveEvent = { id: 'e1', status: 'ACTIVE', deletedAt: null, modules: [posts] };

const state: { event: Record<string, unknown> | null; isHost: boolean; pathname: string; search: string } = {
    event: liveEvent,
    isHost: true,
    pathname: '/events/e1/feed',
    search: '',
};

vi.mock('@/providers/EventProvider', () => ({ useActiveEvent: () => state.event, useIsHost: () => state.isHost }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useSearchParams: () => new URLSearchParams(state.search) }));

describe('useOverviewFabEvent', () => {
    beforeEach(() => {
        Object.assign(state, { event: liveEvent, isHost: true, pathname: '/events/e1/feed', search: '' });
    });

    it('returns the event for a host of a live full event off the Overview', () => {
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBe(liveEvent);
    });

    it('shows on dashboard sections', () => {
        Object.assign(state, { pathname: '/events/e1/manage', search: 'tab=members' });
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBe(liveEvent);
    });

    it.each([
        ['on the Overview', { pathname: '/events/e1/manage', search: '' }],
        ['for a guest', { isHost: false }],
        ['for a draft', { event: { ...liveEvent, status: 'DRAFT' } }],
        ['for a lite event', { event: { ...liveEvent, modules: [] } }],
        ['for a deleted event', { event: { ...liveEvent, deletedAt: '2026-11-01T00:00:00Z' } }],
        ['with no event', { event: null }],
    ])('is null %s', (_label, change) => {
        Object.assign(state, change);
        expect(renderHook(() => useOverviewFabEvent()).result.current).toBeNull();
    });
});
