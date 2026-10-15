import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LANDING_SECTION_DWELL_MS, useLandingSectionTracking } from '@/hooks/useLandingSectionTracking';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

const VIEWPORT_HEIGHT = 800;

// jsdom has no layout, so the test plays the browser: it reports how much of a section is on screen.
class FakeIntersectionObserver {
    static current: FakeIntersectionObserver | null = null;
    readonly targets = new Set<Element>();

    constructor(private readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.current = this;
    }

    observe(target: Element) {
        this.targets.add(target);
    }

    unobserve(target: Element) {
        this.targets.delete(target);
    }

    disconnect() {
        this.targets.clear();
    }

    show(target: Element, visibleHeight: number, height: number) {
        const entry = {
            target,
            boundingClientRect: { height },
            intersectionRect: { height: visibleHeight },
            rootBounds: { height: VIEWPORT_HEIGHT },
        } as unknown as IntersectionObserverEntry;
        this.callback([entry], this as unknown as IntersectionObserver);
    }
}

function observer() {
    if (!FakeIntersectionObserver.current) throw new Error('No observer');
    return FakeIntersectionObserver.current;
}

function section(name: string) {
    return document.querySelector(`[data-landing-section="${name}"]`) as HTMLElement;
}

function mountLanding() {
    document.body.innerHTML = `
        <main id="landing">
            <section data-landing-section="how_it_works"></section>
            <section data-landing-section="stories"></section>
            <footer data-landing-section="footer"></footer>
        </main>
    `;
    const landing = document.getElementById('landing') as HTMLElement;
    renderHook(() => useLandingSectionTracking({ current: landing }));
    return landing;
}

beforeEach(() => {
    track.mockClear();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
    FakeIntersectionObserver.current = null;
    document.body.innerHTML = '';
});

// Stay on a section long enough for it to count.
function dwell() {
    vi.advanceTimersByTime(LANDING_SECTION_DWELL_MS);
}

describe('useLandingSectionTracking', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts a short section once half of it stays on screen', () => {
        mountLanding();

        observer().show(section('how_it_works'), 100, 400);
        dwell();
        expect(track).not.toHaveBeenCalled();

        observer().show(section('how_it_works'), 200, 400);
        dwell();
        expect(track).toHaveBeenCalledExactlyOnceWith('Landing Section', { section: 'how_it_works' });
    });

    it('counts a section taller than the screen once it fills half the screen', () => {
        mountLanding();

        observer().show(section('stories'), VIEWPORT_HEIGHT / 2, 4000);
        dwell();

        expect(track).toHaveBeenCalledExactlyOnceWith('Landing Section', { section: 'stories' });
    });

    it('skips a section the page only scrolls past', () => {
        mountLanding();

        observer().show(section('stories'), VIEWPORT_HEIGHT, 4000);
        vi.advanceTimersByTime(LANDING_SECTION_DWELL_MS / 4);
        observer().show(section('stories'), 0, 4000);
        dwell();

        expect(track).not.toHaveBeenCalled();
        expect(observer().targets.has(section('stories'))).toBe(true);
    });

    it('counts each section only the first time', () => {
        mountLanding();

        observer().show(section('footer'), 300, 300);
        observer().show(section('footer'), 300, 300);
        dwell();

        expect(track).toHaveBeenCalledOnce();
        expect(observer().targets.has(section('footer'))).toBe(false);
    });

    it('watches sections that mount later', async () => {
        vi.useRealTimers();
        const landing = mountLanding();

        landing.insertAdjacentHTML('beforeend', '<section data-landing-section="pricing"></section>');

        await waitFor(() => expect(observer().targets.has(section('pricing'))).toBe(true));
        vi.useFakeTimers();
        observer().show(section('pricing'), 600, 1200);
        dwell();
        expect(track).toHaveBeenCalledExactlyOnceWith('Landing Section', { section: 'pricing' });
    });
});
