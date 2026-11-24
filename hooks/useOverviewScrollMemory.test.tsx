import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOverviewScrollMemory } from '@/hooks/useOverviewScrollMemory';
import type { JourneyPhase } from '@/lib/eventJourney';

const KEY = 'storywall:overview-scroll:e1';

function Journey({ phase }: { phase: JourneyPhase }) {
    useOverviewScrollMemory('e1', phase);
    return (
        <div>
            <a href="https://example.com/gallery">Gallery</a>
            <button type="button">Phase</button>
        </div>
    );
}

// The Overview's journey and, elsewhere on the page, the section menu, both inside the app's <main>.
function renderPage(phase: JourneyPhase) {
    const menu = document.createElement('nav');
    menu.innerHTML = '<a href="https://example.com/members">Members</a>';
    main.appendChild(menu);
    return render(<Journey phase={phase} />, { container: main.appendChild(document.createElement('div')) });
}

let main: HTMLElement;

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    main = document.createElement('main');
    document.body.appendChild(main);
    window.sessionStorage.clear();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    main.remove();
});

describe('useOverviewScrollMemory', () => {
    it('saves the scroll and phase when a link is tapped', () => {
        const { getByText } = renderPage('after');
        main.scrollTop = 420;
        getByText('Gallery').addEventListener('click', (event) => event.preventDefault());
        getByText('Gallery').click();
        expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({ top: 420, phase: 'after' });
    });

    it('saves the spot for a link elsewhere on the page, like the section menu', () => {
        renderPage('after');
        main.scrollTop = 640;
        screen.getByText('Members').addEventListener('click', (event) => event.preventDefault());
        screen.getByText('Members').click();
        expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({ top: 640, phase: 'after' });
    });

    it('saves nothing for a tap that is not a link', () => {
        const { getByText } = renderPage('after');
        main.scrollTop = 420;
        getByText('Phase').click();
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });

    it('scrolls back once on the same phase, then forgets the spot', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        renderPage('after');
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(300);
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });

    it('keeps a spot saved by a tap while it is still scrolling back', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        const { getByText } = renderPage('after');
        main.scrollTop = 120;
        getByText('Gallery').addEventListener('click', (event) => event.preventDefault());
        getByText('Gallery').click();
        vi.advanceTimersToNextFrame();
        expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({ top: 120, phase: 'after' });
    });

    it('stops scrolling back once the host scrolls', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        renderPage('after');
        main.dispatchEvent(new Event('wheel'));
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(0);
    });

    it('leaves the scroll alone on another phase', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'before' }));
        renderPage('after');
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(0);
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });
});
