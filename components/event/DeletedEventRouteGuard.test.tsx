import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeletedEventRouteGuard } from '@/components/event/DeletedEventRouteGuard';
import type { EventDetailResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    routeEventId: 'e-1' as string | null,
    pathname: '/events/e-1/feed',
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useEventContextLoading: () => false,
    useIsHost: () => true,
    useRouteEventId: () => state.routeEventId,
}));
vi.mock('next/navigation', () => ({
    usePathname: () => state.pathname,
    useRouter: () => router,
}));

afterEach(() => {
    cleanup();
    router.replace.mockReset();
    state.routeEventId = 'e-1';
    state.pathname = '/events/e-1/feed';
});

const deletedEvent: Partial<EventDetailResponseDto> = { id: 'e-1', status: 'ACTIVE', deletedAt: '2026-10-03T10:00:00Z' };

describe('DeletedEventRouteGuard', () => {
    it('sends a host of a deleted event from a write surface to its manage page', () => {
        state.event = deletedEvent;
        render(<DeletedEventRouteGuard>page</DeletedEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(screen.getByRole('status')).toBeTruthy();
        expect(router.replace).toHaveBeenCalledWith('/events/e-1/manage');
    });

    it('keeps a host of a deleted event on its gallery', () => {
        state.event = deletedEvent;
        state.pathname = '/events/e-1/tools/gallery';
        render(<DeletedEventRouteGuard>page</DeletedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('leaves a route that does not name the event alone, even if the remembered event is deleted', () => {
        state.routeEventId = null;
        state.pathname = '/post/p-1';
        state.event = deletedEvent;
        render(<DeletedEventRouteGuard>page</DeletedEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });
});
