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

    it('shows no line at the top of the page, and all of it a few pixels down', async () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        const { getByTestId } = render(
            <div data-event-scope="">
                <Strip />
            </div>,
        );
        const strip = getByTestId('strip');
        let scrolled = 0;
        vi.spyOn(strip.parentElement!, 'getBoundingClientRect').mockImplementation(() => rect(0, -scrolled, 1200));
        vi.spyOn(strip, 'getBoundingClientRect').mockImplementation(() => rect(0, 0, 900));
        const lineAt = async (top: number) => {
            scrolled = top;
            await act(async () => {
                document.dispatchEvent(new Event('scroll'));
                await new Promise((resolve) => requestAnimationFrame(resolve));
            });
            return strip.style.getPropertyValue('--feed-strip-line');
        };

        expect(await lineAt(6)).toBe('0.5');
        expect(await lineAt(300)).toBe('1');
        expect(await lineAt(0)).toBe('0');
        // Pulled past the top.
        expect(await lineAt(-20)).toBe('0');
    });

    it('does nothing outside the event page', () => {
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
        const { getByTestId } = render(<Strip />);
        expect(getByTestId('strip').style.getPropertyValue('--feed-strip-y')).toBe('');
    });
});
