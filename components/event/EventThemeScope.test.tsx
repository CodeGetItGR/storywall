import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventThemeScope } from '@/components/event/EventThemeScope';
import type { EventDetailResponseDto } from '@/lib/api/types';

const state = vi.hoisted(() => ({
    event: null as Partial<EventDetailResponseDto> | null,
    routeEventId: 'e-1' as string | null,
    pathname: '/events/e-1/feed',
}));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));

vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => state.event,
    useRouteEventId: () => state.routeEventId,
}));

const themedEvent: Partial<EventDetailResponseDto> = {
    id: 'e-1',
    theme: {
        presetKey: 'dino-mint',
        backgroundColor: '#BFE6E2',
        illustrationUrl: 'https://media.example/dino.webp',
        titleColor: null,
        headingFont: null,
    },
};

const FONT = { key: 'dino-serif', fallback: 'serif' as const, url: '/api/theme-fonts/dino-serif/3.woff2' };

const fontedEvent: Partial<EventDetailResponseDto> = {
    id: 'e-1',
    theme: { ...themedEvent.theme!, titleColor: '#7A1F3D', headingFont: FONT },
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
    state.pathname = '/events/e-1/feed';
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

    it("ignores the remembered event's font and title colour on an id-less route (/post/[id])", () => {
        // No route event id means no theme at all: the remembered event is not what the page is about.
        state.event = fontedEvent;
        state.routeEventId = null;
        state.pathname = '/post/p-1';
        const root = renderScope();
        expect(document.querySelector('style')).toBeNull();
        expect(root).not.toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-title')).toBe('');
        expect(root.style.getPropertyValue('--event-heading-font')).toBe('');
    });

    it("stays plain on the host's working pages", () => {
        state.event = themedEvent;
        state.pathname = '/events/e-1/manage/qr';
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('');
    });

    it('ignores a cached event that is not the route event', () => {
        state.event = themedEvent;
        state.routeEventId = 'e-2';
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('');
    });

    it('sets the post-card tokens on a themed page', () => {
        state.event = themedEvent;
        const root = renderScope();
        expect(root.style.getPropertyValue('--event-card-bg')).toBe('#BFE6E2');
        expect(root.style.getPropertyValue('--event-card-line')).not.toBe('');
    });

    it('declares the heading font once and marks the scope on a themed page with a font', () => {
        state.event = fontedEvent;
        const root = renderScope();
        const styles = document.querySelectorAll('style');
        expect(styles).toHaveLength(1);
        expect(styles[0].textContent).toContain('@font-face');
        expect(styles[0].textContent).toContain('/api/theme-fonts/dino-serif/3.woff2');
        expect(root).toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-heading-font')).toBe('"theme-dino-serif", serif');
        expect(root.style.getPropertyValue('--event-title')).toBe('#7A1F3D');
    });

    it('declares no font and sets no title colour on a host page', () => {
        state.event = fontedEvent;
        state.pathname = '/events/e-1/manage';
        const root = renderScope();
        expect(document.querySelector('style')).toBeNull();
        expect(root).not.toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-title')).toBe('');
        expect(root.style.getPropertyValue('--event-card-bg')).toBe('');
    });

    it('declares no font when the theme has none', () => {
        state.event = themedEvent;
        const root = renderScope();
        expect(document.querySelector('style')).toBeNull();
        expect(root).not.toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-title')).toBe('');
    });

    it.each(['red', null])('declares no font on an unusable background (%s)', (backgroundColor) => {
        state.event = { id: 'e-1', theme: { ...fontedEvent.theme!, backgroundColor: backgroundColor as string } };
        const root = renderScope();
        expect(document.querySelector('style')).toBeNull();
        expect(root).not.toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-title')).toBe('');
    });
});
