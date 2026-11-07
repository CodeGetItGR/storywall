import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { useFitTextWidth } from '@/hooks/useFitTextWidth';

const BOX_WIDTH = 300;
// Each pixel of font size makes the line this much wider.
const WIDTH_PER_PX = 20;
const CSS_SIZE = 19;

function sizeOf(text: HTMLElement) {
    return parseFloat(text.style.fontSize) || CSS_SIZE;
}

beforeAll(() => {
    // jsdom has no layout. The line is as wide as its font size makes it.
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) {
            return this.classList.contains('box') ? BOX_WIDTH : 0;
        },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
        configurable: true,
        get(this: HTMLElement) {
            if (!this.classList.contains('text-block')) return 0;
            // With reduced motion on, the app gives everything a short transition,
            // so a new size isn't measured until it ends, unless transitions are off.
            const size = this.dataset.transitions === 'on' && this.style.transitionProperty !== 'none' ? CSS_SIZE : sizeOf(this);
            return size * WIDTH_PER_PX;
        },
    });
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

function FitLine({ transitions }: { transitions: boolean }) {
    const ref = useFitTextWidth<HTMLDivElement>();

    return (
        <div className="box" ref={ref}>
            <div className="text-block" data-transitions={transitions ? 'on' : 'off'}>
                GR00 0000 0000 0000 0000 0000 000
            </div>
        </div>
    );
}

function fittedSize(transitions: boolean) {
    const { container } = render(<FitLine transitions={transitions} />);
    return sizeOf(container.querySelector<HTMLElement>('.text-block')!);
}

describe('useFitTextWidth', () => {
    it('shrinks the line just enough to fit its box', () => {
        expect(fittedSize(false)).toBe(BOX_WIDTH / WIDTH_PER_PX);
    });

    it('fits the same when the page animates size changes', () => {
        expect(fittedSize(true)).toBe(BOX_WIDTH / WIDTH_PER_PX);
    });
});
