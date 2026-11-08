import { cleanup, render } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { useFitTextWidth } from '@/hooks/useFitTextWidth';

// jsdom has no layout, so the text's width is faked: 15px of width per px of
// font size. While a transition is on, the width still shows the size the
// text had before, as it does in a browser until the transition ends.
const WIDTH_PER_PX = 15;
const BOX_WIDTH = 200;

function fakeLayout(text: HTMLElement) {
    let shownSize = 19;
    Object.defineProperty(text, 'scrollWidth', {
        get() {
            if (text.style.transition === 'none') shownSize = parseFloat(text.style.fontSize) || 19;
            return shownSize * WIDTH_PER_PX;
        },
    });
}

function FitBox({ withTransition }: { withTransition?: boolean }) {
    const ref = useFitTextWidth<HTMLDivElement>();
    const textRef = useRef<HTMLSpanElement>(null);
    // Layout effects run before the hook's effect, so the fakes are in place when it measures.
    useLayoutEffect(() => {
        if (ref.current) Object.defineProperty(ref.current, 'clientWidth', { value: BOX_WIDTH });
        if (textRef.current) fakeLayout(textRef.current);
    }, [ref]);
    return (
        <div ref={ref}>
            <span ref={textRef} className="text-block" style={withTransition ? { transition: 'opacity 2s' } : undefined}>
                GR00 0000 0000 0000 0000 0000 000
            </span>
        </div>
    );
}

beforeAll(() => {
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe() {}
            disconnect() {}
        },
    );
});

afterEach(cleanup);

describe('useFitTextWidth', () => {
    it('shrinks the text to the largest size that fits, even while transitions are on', () => {
        const { container } = render(<FitBox />);
        const text = container.querySelector<HTMLElement>('.text-block')!;

        // 13px is 195px wide, the largest half-pixel step that fits in 200px.
        expect(text.style.fontSize).toBe('13px');
    });

    it('gives the text back its own transition after measuring', () => {
        const { container } = render(<FitBox withTransition />);
        const text = container.querySelector<HTMLElement>('.text-block')!;

        expect(text.style.transition).toBe('opacity 2s');
        expect(text.style.fontSize).toBe('13px');
    });
});
