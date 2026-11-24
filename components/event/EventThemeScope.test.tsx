import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventThemeScope } from '@/components/event/EventThemeScope';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { publishFeedPageTheme } from '@/lib/feedPageTheme';

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
    return screen.getByText('content').closest<HTMLElement>('[data-event-scope]')!;
}

afterEach(() => {
    cleanup();
    state.event = null;
    state.routeEventId = 'e-1';
    state.pathname = '/events/e-1/feed';
});

afterEach(() => {
    publishFeedPageTheme('feed', null);
    publishFeedPageTheme('edit', null);
});

describe('EventThemeScope', () => {
    it("draws the feed's theme backdrop behind the page and puts the post cards on its light tone", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', {
            eventId: 'e-1',
            value: {
                theme: { ...themedEvent.theme!, backgroundColor: '#EFE7EC' },
                backdrop: {
                    color: '#EFE7EC',
                    image: { desktop: 'https://media.example/d.jpg', mobile: 'https://media.example/m.jpg' },
                    size: '100% auto',
                    repeat: 'repeat-y',
                    position: 'center top',
                    tiled: false,
                    fixed: false,
                    cardColor: '#F9F5F7',
                },
            },
        });
        const root = renderScope();
        expect(root.className).toContain('feed-backdrop');
        expect(root.className).not.toContain('feed-backdrop--fixed');
        expect(root.querySelector('[data-feed-backdrop-layer]')).toBeNull();
        expect(root.style.getPropertyValue('--event-bg')).toBe('#EFE7EC');
        expect(root.style.getPropertyValue('--event-card-bg')).toBe('#F9F5F7');
        expect(root.style.getPropertyValue('--event-card-line')).toBe('color-mix(in oklab, #F9F5F7 85%, #000000)');
        expect(root.style.getPropertyValue('--feed-backdrop-mobile')).toBe('url("https://media.example/m.jpg")');
    });

    it("puts a cover picture on a layer fixed to the screen, before the page's content", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', {
            eventId: 'e-1',
            value: {
                theme: { ...themedEvent.theme!, backgroundColor: '#EFE7EC' },
                backdrop: {
                    color: '#EFE7EC',
                    image: { desktop: 'https://media.example/d.jpg', mobile: 'https://media.example/m.jpg' },
                    size: 'cover',
                    repeat: 'no-repeat',
                    position: 'center',
                    tiled: false,
                    fixed: true,
                    cardColor: '#F9F5F7',
                },
            },
        });
        const root = renderScope();
        expect(root.className).toContain('feed-backdrop--fixed');
        const layer = root.querySelector('[data-feed-backdrop-layer]');
        expect(layer).toHaveAttribute('aria-hidden', 'true');
        expect(layer?.nextElementSibling).toHaveClass('feed-backdrop-content');
        expect(layer?.nextElementSibling).toContainElement(screen.getByText('content'));
    });

    it('draws no backdrop for the background colour alone', () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: { ...themedEvent.theme!, backgroundColor: '#F5E6D3' } } });
        const root = renderScope();
        expect(root.className).not.toContain('feed-backdrop');
        expect(root.style.getPropertyValue('--event-card-bg')).toBe('#F5E6D3');
    });
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

    it("draws the feed's override for this event", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: { ...themedEvent.theme!, backgroundColor: '#F5E6D3' } } });
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('#F5E6D3');
    });

    it("ignores another event's override", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', { eventId: 'e-2', value: { theme: null } });
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
    });

    it.each(['red', null])('declares no font on an unusable background (%s)', (backgroundColor) => {
        state.event = { id: 'e-1', theme: { ...fontedEvent.theme!, backgroundColor: backgroundColor as string } };
        const root = renderScope();
        expect(document.querySelector('style')).toBeNull();
        expect(root).not.toHaveAttribute('data-theme-font');
        expect(root.style.getPropertyValue('--event-title')).toBe('');
    });
});
