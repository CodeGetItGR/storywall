import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventLifecycleBanner } from '@/components/event/EventLifecycleBanner';
import type { EventDetailResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    routeEventId: 'e-1' as string | null,
    pathname: '/events/e-1/feed',
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useIsHost: () => true,
    useRouteEventId: () => state.routeEventId,
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));

afterEach(() => {
    cleanup();
    state.routeEventId = 'e-1';
    state.pathname = '/events/e-1/feed';
});

const draftEvent: Partial<EventDetailResponseDto> = { id: 'e-1', status: 'DRAFT' };

describe('EventLifecycleBanner', () => {
    it('tells a host the event is a draft and links to its manage page', () => {
        state.event = draftEvent;
        render(<EventLifecycleBanner />);
        expect(screen.getByText('DRAFT.title')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'DRAFT.action' }).getAttribute('href')).toBe('/events/e-1/manage');
    });

    it('hides on a route that does not name the event, even if the remembered event is a draft', () => {
        state.routeEventId = null;
        state.pathname = '/post/p-1';
        state.event = draftEvent;
        render(<EventLifecycleBanner />);
        expect(screen.queryByText('DRAFT.title')).toBeNull();
    });
});
