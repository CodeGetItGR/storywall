import { act, cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTextReveal } from '@/hooks/useTextReveal';
import { stubIntersectionObserver } from '@/lib/invitation/fakeIntersectionObserver';
import type { TextAnimation } from '@/lib/invitation/textReveal';

const mocks = vi.hoisted(() => ({ reduce: false, animate: vi.fn(), finish: [] as (() => void)[], cancel: vi.fn() }));

vi.mock('framer-motion', () => ({ useReducedMotion: () => mocks.reduce }));
vi.mock('framer-motion/dom/mini', () => ({ animate: mocks.animate }));

// jsdom has no layout, so everything is placed by the test before the hook runs.
const PLACES: Record<string, number> = { first: 100, second: 3000 };
const placeBeforeLayoutEffects = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');

function Page({ animation }: { animation: TextAnimation }) {
    const rootRef = useRef<HTMLDivElement>(null);
    useTextReveal(rootRef, animation);
    return (
        <div ref={rootRef} data-testid="root" className="wedart-text-anim-waiting">
            <section className="section">
                <div className="text-block" data-testid="first" />
                <div className="text-block" data-testid="second" />
            </section>
            <div className="text-block" data-testid="outside" />
        </div>
    );
}

let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    mocks.reduce = false;
    mocks.finish = [];
    vi.clearAllMocks();
    mocks.animate.mockImplementation(() => ({
        cancel: mocks.cancel,
        then: (done: () => void) => mocks.finish.push(done),
    }));
    placeBeforeLayoutEffects.mockImplementation(function (this: HTMLElement) {
        const top = PLACES[this.dataset.testid ?? ''] ?? 5000;
        return { top, bottom: top + 40, left: 0, right: 375, width: 375, height: 40 } as DOMRect;
    });
    io = stubIntersectionObserver();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('useTextReveal', () => {
    it('plays text already on screen straight away, with the old timing', () => {
        const { getByTestId } = render(<Page animation="blur-in" />);
        expect(mocks.animate).toHaveBeenCalledTimes(1);
        expect(mocks.animate).toHaveBeenCalledWith(
            getByTestId('first'),
            { opacity: [0, 1], filter: ['blur(8px)', 'blur(0px)'] },
            { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
        );
    });

    it('stops waiting, and keeps text below the window hidden until it arrives', () => {
        const { getByTestId } = render(<Page animation="blur-in" />);
        expect(getByTestId('root').classList.contains('wedart-text-anim-waiting')).toBe(false);
        expect(getByTestId('first').classList.contains('wedart-text-anim-pending')).toBe(false);
        expect(getByTestId('second').classList.contains('wedart-text-anim-pending')).toBe(true);

        act(() => io.show(getByTestId('second')));
        expect(getByTestId('second').classList.contains('wedart-text-anim-pending')).toBe(false);
        expect(mocks.animate).toHaveBeenCalledTimes(2);
    });

    it('plays each block once', () => {
        const { getByTestId } = render(<Page animation="blur-in" />);
        expect(io.watching(getByTestId('first'))).toBe(false);
        act(() => io.show(getByTestId('second')));
        act(() => io.show(getByTestId('second')));
        expect(mocks.animate).toHaveBeenCalledTimes(2);
    });

    it('also catches text through a scroll, as the old engine did', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
        const { getByTestId } = render(<Page animation="blur-in" />);
        PLACES.second = 300;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
            vi.advanceTimersToNextTimer();
        });
        PLACES.second = 3000;
        vi.useRealTimers();
        expect(getByTestId('second').classList.contains('wedart-text-anim-pending')).toBe(false);
    });

    it('leaves text outside sections alone, as the old engine did', () => {
        const { getByTestId } = render(<Page animation="blur-in" />);
        expect(getByTestId('outside').classList.contains('wedart-text-anim-pending')).toBe(false);
    });

    it('clears what it set when a block finishes', () => {
        const { getByTestId } = render(<Page animation="soft-rise" />);
        const block = getByTestId('first');
        block.style.opacity = '1';
        block.style.filter = 'blur(0px)';
        block.style.transform = 'translateY(0px)';
        block.style.color = 'red';
        act(() => mocks.finish[0]());
        expect(block.style.opacity).toBe('');
        expect(block.style.filter).toBe('');
        expect(block.style.transform).toBe('');
        expect(block.style.color).toBe('red');
    });

    it('stops and shows everything when it leaves the page', () => {
        const { getByTestId, unmount } = render(<Page animation="blur-in" />);
        const second = getByTestId('second');
        unmount();
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
        expect(second.classList.contains('wedart-text-anim-pending')).toBe(false);
        expect(io.count()).toBe(0);
    });

    it('hides and plays nothing for someone who prefers less motion', () => {
        mocks.reduce = true;
        const { getByTestId } = render(<Page animation="blur-in" />);
        expect(mocks.animate).not.toHaveBeenCalled();
        expect(getByTestId('root').classList.contains('wedart-text-anim-waiting')).toBe(false);
        expect(getByTestId('second').classList.contains('wedart-text-anim-pending')).toBe(false);
    });

    it('does nothing for a theme with no text animation', () => {
        const { getByTestId } = render(<Page animation="none" />);
        expect(mocks.animate).not.toHaveBeenCalled();
        expect(io.count()).toBe(0);
        expect(getByTestId('second').classList.contains('wedart-text-anim-pending')).toBe(false);
    });
});
