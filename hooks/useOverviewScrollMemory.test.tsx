import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOverviewScrollMemory } from '@/hooks/useOverviewScrollMemory';
import type { JourneyPhase } from '@/lib/eventJourney';

const KEY = 'storywall:overview-scroll:e1';

function Journey({ phase }: { phase: JourneyPhase }) {
    const ref = useOverviewScrollMemory('e1', phase);
    return (
        <div ref={ref}>
            <a href="https://example.com/gallery">Gallery</a>
            <button type="button">Phase</button>
        </div>
    );
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
        const { getByText } = render(<Journey phase="after" />);
        main.scrollTop = 420;
        getByText('Gallery').addEventListener('click', (event) => event.preventDefault());
        getByText('Gallery').click();
        expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({ top: 420, phase: 'after' });
    });

    it('saves nothing for a tap that is not a link', () => {
        const { getByText } = render(<Journey phase="after" />);
        main.scrollTop = 420;
        getByText('Phase').click();
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });

    it('scrolls back once on the same phase, then forgets the spot', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        render(<Journey phase="after" />);
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(300);
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });

    it('keeps a spot saved by a tap while it is still scrolling back', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        const { getByText } = render(<Journey phase="after" />);
        main.scrollTop = 120;
        getByText('Gallery').addEventListener('click', (event) => event.preventDefault());
        getByText('Gallery').click();
        vi.advanceTimersToNextFrame();
        expect(JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')).toEqual({ top: 120, phase: 'after' });
    });

    it('stops scrolling back once the host scrolls', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'after' }));
        render(<Journey phase="after" />);
        main.dispatchEvent(new Event('wheel'));
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(0);
    });

    it('leaves the scroll alone on another phase', () => {
        window.sessionStorage.setItem(KEY, JSON.stringify({ top: 300, phase: 'before' }));
        render(<Journey phase="after" />);
        vi.advanceTimersToNextFrame();
        expect(main.scrollTop).toBe(0);
        expect(window.sessionStorage.getItem(KEY)).toBeNull();
    });
});
