import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedBackdropStrip } from '@/hooks/useFeedBackdropStrip';

function Strip() {
    const ref = useFeedBackdropStrip<HTMLDivElement>();
    return <div ref={ref} data-testid="strip" />;
}

function rect(left: number, top: number, width: number): DOMRect {
    return { left, top, width, height: 0, right: left + width, bottom: top, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('useFeedBackdropStrip', () => {
    it('tells the strip where it sits on the page and how wide the page is, and follows a scroll', async () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        const { getByTestId } = render(
            <div data-event-scope="">
                <Strip />
            </div>,
        );
        const strip = getByTestId('strip');
        const page = strip.parentElement!;
        let scrolled = 0;
        vi.spyOn(page, 'getBoundingClientRect').mockImplementation(() => rect(80, 40 - scrolled, 1200));
        vi.spyOn(strip, 'getBoundingClientRect').mockImplementation(() => rect(80, 0, 900));

        scrolled = 300;
        await act(async () => {
            document.dispatchEvent(new Event('scroll'));
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });
        expect(strip.style.getPropertyValue('--feed-page-w')).toBe('1200px');
        expect(strip.style.getPropertyValue('--feed-strip-x')).toBe('0px');
        expect(strip.style.getPropertyValue('--feed-strip-y')).toBe('260px');
    });

    it('does nothing outside the event page', () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        const { getByTestId } = render(<Strip />);
        expect(getByTestId('strip').style.getPropertyValue('--feed-strip-y')).toBe('');
    });
});
