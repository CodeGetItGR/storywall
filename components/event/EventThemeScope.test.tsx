import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventThemeScope } from '@/components/event/EventThemeScope';
import type { EventDetailResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    routeEventId: 'e-1' as string | null,
}));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useRouteEventId: () => state.routeEventId,
}));

const themedEvent: Partial<EventDetailResponseDto> = {
    id: 'e-1',
    theme: { presetKey: 'dino-mint', backgroundColor: '#BFE6E2', illustrationUrl: 'https://media.example/dino.webp' },
};

function renderScope() {
    render(
        <EventThemeScope>
            <p>content</p>
        </EventThemeScope>,
    );
    return screen.getByText('content').parentElement as HTMLElement;
}

afterEach(() => {
    cleanup();
    state.event = null;
    state.routeEventId = 'e-1';
});

describe('EventThemeScope', () => {
    it("sets the route event's theme colour as --event-bg", () => {
        state.event = themedEvent;
        const root = renderScope();
        expect(root.style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
        expect(root.className).toContain('bg-event');
    });

    it('leaves the variable unset without a theme', () => {
        state.event = { id: 'e-1', theme: null };
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('');
    });

    it('ignores the remembered event on a route that does not name it', () => {
        state.event = themedEvent;
        state.routeEventId = null;
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('');
    });

    it('ignores a cached event that is not the route event', () => {
        state.event = themedEvent;
        state.routeEventId = 'e-2';
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('');
    });
});
