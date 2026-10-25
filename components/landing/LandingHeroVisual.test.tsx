import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingHeroVisual } from '@/components/landing/LandingHeroVisual';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

class InertResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// The original file behind an image, whether served as is or through the Next.js resizer (`/_next/image?url=…`).
function sourcePath(image: HTMLImageElement) {
    const src = image.getAttribute('src') ?? '';
    return src.startsWith('/_next/image') ? new URL(src, 'http://localhost').searchParams.get('url') : src;
}

function feedScreenshots(container: HTMLElement) {
    return [...container.querySelectorAll('img')].filter((image) => sourcePath(image)?.includes('sw-phone-feed'));
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
        expect(feedScreenshots(container).map(sourcePath)).toEqual([
            '/landing/sw-phone-feed.webp',
            '/landing/sw-phone-feed-2.webp',
            '/landing/sw-phone-feed-3.webp',
        ]);
    });

    it('serves every hero image through the resizer with its drawn size', () => {
        const { container } = render(<LandingHeroVisual motionPaused={false} />);
        for (const image of container.querySelectorAll('img')) {
            expect(image.getAttribute('src')).toMatch(/^\/_next\/image\?url=%2Flanding%2F/);
            expect(image.getAttribute('sizes')).toMatch(/^\(min-width: 761px\) min\(/);
        }
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

    it('takes its size and place from the page when given', () => {
        const { container } = render(<LandingHeroVisual className="w-10" motionPaused={false} />);
        const root = container.firstElementChild;
        expect(root).toHaveClass('w-10', 'aspect-[1136/1204]');
        expect(root).not.toHaveClass('w-[137vw]');
    });
});
