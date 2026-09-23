import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLandingHeroFeedTravel } from '@/hooks/useLandingHeroFeedTravel';

// jsdom has no layout, so each test sets the two heights the hook reads and
// fires the resize callbacks itself.
let feedHeight = 0;
let screenHeight = 0;
const resizeCallbacks: Array<() => void> = [];
const disconnect = vi.fn();

class FakeResizeObserver {
    constructor(callback: () => void) {
        resizeCallbacks.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
}

function PhoneFeed() {
    const { screenRef, trackRef } = useLandingHeroFeedTravel();
    return (
        <div data-testid="screen" ref={screenRef}>
            <div data-testid="track" ref={trackRef} />
        </div>
    );
}

function renderFeed(feed: number, phoneScreen: number) {
    feedHeight = feed;
    screenHeight = phoneScreen;
    render(<PhoneFeed />);
    return screen.getByTestId('track');
}

function resizeTo(feed: number, phoneScreen: number) {
    feedHeight = feed;
    screenHeight = phoneScreen;
    act(() => resizeCallbacks.forEach((callback) => callback()));
}

function stop(track: HTMLElement, name: string) {
    return Number.parseFloat(track.style.getPropertyValue(name));
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return this.dataset.testid === 'track' ? feedHeight : 0;
    });
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
        return this.dataset.testid === 'screen' ? screenHeight : 0;
    });
});

afterEach(() => {
    cleanup();
    resizeCallbacks.length = 0;
    disconnect.mockClear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('useLandingHeroFeedTravel', () => {
    it('scrolls until the bottom of the feed meets the bottom of the screen', () => {
        const track = renderFeed(2512, 534);
        expect(stop(track, '--sw-feed-end')).toBe(-1978);
    });

    it('pauses 32% and 67% of the way down', () => {
        const track = renderFeed(2512, 534);
        expect(stop(track, '--sw-feed-stop-1')).toBeCloseTo(-632.96);
        expect(stop(track, '--sw-feed-stop-2')).toBeCloseTo(-1325.26);
    });

    it('measures again when the phone is resized', () => {
        const track = renderFeed(2512, 534);
        resizeTo(2693, 573);
        expect(stop(track, '--sw-feed-end')).toBe(-2120);
        expect(stop(track, '--sw-feed-stop-1')).toBeCloseTo(-678.4);
    });

    it('keeps the feed still when it already fits the screen', () => {
        const track = renderFeed(400, 534);
        expect(stop(track, '--sw-feed-end')).toBe(0);
        expect(stop(track, '--sw-feed-stop-1')).toBe(0);
    });

    it('stops watching for resizes once unmounted', () => {
        renderFeed(2512, 534);
        cleanup();
        expect(disconnect).toHaveBeenCalled();
    });
});
