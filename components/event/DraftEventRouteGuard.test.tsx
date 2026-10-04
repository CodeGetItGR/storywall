import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DraftEventRouteGuard } from '@/components/event/DraftEventRouteGuard';
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

const draftEvent: Partial<EventDetailResponseDto> = { id: 'e-1', status: 'DRAFT' };

describe('DraftEventRouteGuard', () => {
    it('sends a host of a draft event to its manage page', () => {
        state.event = draftEvent;
        render(<DraftEventRouteGuard>page</DraftEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(screen.getByRole('status')).toBeTruthy();
        expect(router.replace).toHaveBeenCalledWith('/events/e-1/manage');
    });

    it('keeps a host of a draft event on its manage page', () => {
        state.event = draftEvent;
        state.pathname = '/events/e-1/manage';
        render(<DraftEventRouteGuard>page</DraftEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('leaves a route that does not name the event alone, even if the remembered event is a draft', () => {
        state.routeEventId = null;
        state.pathname = '/post/p-1';
        state.event = draftEvent;
        render(<DraftEventRouteGuard>page</DraftEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });
});
