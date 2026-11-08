import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { FIT_TEXT_MIN_SIZE, useFitTextWidth } from '@/hooks/useFitTextWidth';

const BOX_WIDTH = 300;
const CSS_SIZE = 19;
const LINE_HEIGHT = 1.3;

function sizeOf(text: HTMLElement) {
    return parseFloat(text.style.fontSize) || CSS_SIZE;
}

// jsdom has no layout. The line is as wide as its font size makes it: each
// pixel of font size adds `data-width-per-px` pixels of width.
function layout(text: HTMLElement) {
    // With reduced motion on, the app gives everything a short transition, so a
    // new size isn't measured until it ends, unless transitions are off.
    const delayed = text.dataset.transitions === 'on' && text.style.transitionProperty !== 'none';
    const size = delayed ? CSS_SIZE : sizeOf(text);
    const width = size * Number(text.dataset.widthPerPx);
    const wraps = text.style.whiteSpace === 'normal';
    const lines = wraps ? Math.ceil(width / BOX_WIDTH) : 1;
    return { width: wraps ? Math.min(width, BOX_WIDTH) : width, height: lines * size * LINE_HEIGHT };
}

beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.classList.contains('box') ? BOX_WIDTH : 0;
        },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.classList.contains('text-block') ? layout(this).width : 0;
        },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
            return this.classList.contains('text-block') ? layout(this).height : 0;
        },
    });
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

type FitLineProps = { widthPerPx: number; transitions?: boolean };

function FitLine({ widthPerPx, transitions = false }: FitLineProps) {
    const ref = useFitTextWidth<HTMLDivElement>();

    return (
        <div className="box" ref={ref}>
            <div className="text-block" data-width-per-px={widthPerPx} data-transitions={transitions ? 'on' : 'off'}>
                GR00 0000 0000 0000 0000 0000 000
            </div>
        </div>
    );
}

function fitted(props: FitLineProps) {
    const { container } = render(<FitLine {...props} />);
    const text = container.querySelector<HTMLElement>('.text-block')!;
    return { size: sizeOf(text), wraps: text.style.whiteSpace === 'normal' };
}

describe('useFitTextWidth', () => {
    it('shrinks the line just enough to fit its box', () => {
        expect(fitted({ widthPerPx: 20 })).toEqual({ size: 15, wraps: false });
    });

    it('fits the same when the page animates size changes', () => {
        expect(fitted({ widthPerPx: 20, transitions: true })).toEqual({ size: 15, wraps: false });
    });

    it('goes onto two lines, as large as fits, rather than shrink below a readable size', () => {
        // One line would need 300 / 30 = 10px. Two lines fit at 600 / 30 = 20px, so it keeps its own size.
        expect(fitted({ widthPerPx: 30 })).toEqual({ size: CSS_SIZE, wraps: true });
        // Two lines fit at 600 / 40 = 15px.
        expect(fitted({ widthPerPx: 40 })).toEqual({ size: 15, wraps: true });
    });

    it('never goes below the readable size', () => {
        expect(fitted({ widthPerPx: 100 })).toEqual({ size: FIT_TEXT_MIN_SIZE, wraps: true });
    });
});
