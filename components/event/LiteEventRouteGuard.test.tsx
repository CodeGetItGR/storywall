import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LiteEventRouteGuard } from '@/components/event/LiteEventRouteGuard';
import type { EventDetailResponseDto, EventModuleResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    routeEventId: 'e1' as string | null,
    pathname: '/events/e1/feed',
    isHost: true,
    isLoading: false,
}));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useEventContextLoading: () => state.isLoading,
    useIsHost: () => state.isHost,
    useRouteEventId: () => state.routeEventId,
}));
vi.mock('next/navigation', () => ({
    usePathname: () => state.pathname,
    useRouter: () => router,
}));

afterEach(() => {
    cleanup();
    router.replace.mockReset();
    state.routeEventId = 'e1';
    state.pathname = '/events/e1/feed';
    state.isHost = true;
    state.isLoading = false;
});

function module_(moduleKey: string, isEnabled: boolean) {
    return { moduleKey, isEnabled, isAvailable: isEnabled } as EventModuleResponseDto;
}

function event_(modules: EventModuleResponseDto[], overrides: Partial<EventDetailResponseDto> = {}): Partial<EventDetailResponseDto> {
    return { id: 'e1', status: 'ACTIVE', deletedAt: null, suspended: false, modules, ...overrides };
}

const liteEvent = event_([module_('posts', false), module_('gallery', true)]);
const fullEvent = event_([module_('posts', true), module_('gallery', true)]);

describe('LiteEventRouteGuard', () => {
    it("sends a lite event's host from the feed to its home", () => {
        state.event = liteEvent;
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.queryByText('page')).toBeNull();
        expect(router.replace).toHaveBeenCalledWith('/events/e1/tools/gallery');
    });

    it("keeps a lite event's host on its home", () => {
        state.event = liteEvent;
        state.pathname = '/events/e1/tools/gallery';
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it("leaves a full event's host on the feed", () => {
        state.event = fullEvent;
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('leaves a draft lite event to the draft guard', () => {
        state.event = event_(liteEvent.modules!, { status: 'DRAFT' });
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('leaves a non-host member of a lite event alone', () => {
        state.event = liteEvent;
        state.isHost = false;
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it('waits while the event context loads', () => {
        state.event = liteEvent;
        state.isLoading = true;
        render(<LiteEventRouteGuard>page</LiteEventRouteGuard>);
        expect(screen.getByText('page')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalled();
    });
});
