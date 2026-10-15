import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function feedScreenshots(container: HTMLElement) {
    return [...container.querySelectorAll('img')].filter((image) => image.getAttribute('src')?.includes('sw-phone-feed'));
}

beforeEach(() => {
    vi.stubGlobal('ResizeObserver', InertResizeObserver);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('LandingHeroVisual', () => {
    it('stacks the feed screenshots with the event header first', () => {
        const { container } = render(<LandingHeroVisual motionPaused={false} />);
        expect(feedScreenshots(container).map((image) => image.getAttribute('src'))).toEqual([
            '/landing/sw-phone-feed.webp',
            '/landing/sw-phone-feed-2.webp',
            '/landing/sw-phone-feed-3.webp',
        ]);
    });

    it('loads every feed screenshot up front so none pops in mid-scroll, after the rest of the hero', () => {
        const { container } = render(<LandingHeroVisual motionPaused={false} />);
        const screenshots = feedScreenshots(container);
        expect(screenshots.map((image) => image.getAttribute('loading'))).toEqual(['eager', 'eager', 'eager']);
        expect(screenshots.map((image) => image.getAttribute('fetchpriority'))).toEqual(['low', 'low', 'low']);
    });

    it('freezes the feed scroll only while landing motion is paused', () => {
        const { container, rerender } = render(<LandingHeroVisual motionPaused />);
        const track = feedScreenshots(container)[0].parentElement;
        expect(track).toHaveAttribute('data-paused');

        rerender(<LandingHeroVisual motionPaused={false} />);
        expect(track).not.toHaveAttribute('data-paused');
    });
});
