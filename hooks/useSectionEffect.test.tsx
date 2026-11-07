import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSectionEffect } from '@/hooks/useSectionEffect';
import type { SectionEffect } from '@/lib/invitation/backgroundEffects';
import { placeElement, stubIntersectionObserver } from '@/lib/invitation/fakeIntersectionObserver';

const mocks = vi.hoisted(() => ({
    reduce: false,
    controller: { start: vi.fn(), stop: vi.fn() },
    createCanvasEffect: vi.fn(),
    playback: { cancel: vi.fn() },
    animate: vi.fn(),
}));

vi.mock('framer-motion', () => ({ useReducedMotion: () => mocks.reduce }));
vi.mock('framer-motion/dom/mini', () => ({ animate: mocks.animate }));
vi.mock('@/lib/invitation/canvasEffects', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/invitation/canvasEffects')>()),
    createCanvasEffect: mocks.createCanvasEffect,
}));

function Layer({ effect }: { effect: SectionEffect }) {
    const { layerRef, backgroundRef, canvasRef, inView } = useSectionEffect(effect);
    return (
        <div ref={layerRef} data-testid="layer" data-in-view={inView}>
            <div ref={backgroundRef} data-testid="background" />
            <canvas ref={canvasRef} />
        </div>
    );
}

const effect = (type: SectionEffect['type']): SectionEffect => ({ type, speed: 'slow', intensity: 'subtle' });

let io: ReturnType<typeof stubIntersectionObserver>;

beforeEach(() => {
    mocks.reduce = false;
    vi.clearAllMocks();
    mocks.createCanvasEffect.mockReturnValue(mocks.controller);
    mocks.animate.mockReturnValue(mocks.playback);
    io = stubIntersectionObserver();
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('useSectionEffect', () => {
    it('watches the section with the old margins', () => {
        render(<Layer effect={effect('slowZoom')} />);
        expect(io.options()).toEqual([{ threshold: 0.01, rootMargin: '0px 0px -4% 0px' }]);
    });

    it('is in view only while the observer says so', () => {
        const { getByTestId } = render(<Layer effect={effect('slowZoom')} />);
        const layer = getByTestId('layer');
        placeElement(layer, 2000);
        expect(layer.dataset.inView).toBe('false');
        act(() => io.show(layer));
        expect(layer.dataset.inView).toBe('true');
        act(() => io.show(layer, false));
        expect(layer.dataset.inView).toBe('false');
    });

    it('also catches it through a scroll, as the old engine did', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
        const { getByTestId } = render(<Layer effect={effect('slowZoom')} />);
        const layer = getByTestId('layer');
        placeElement(layer, 100);
        act(() => {
            document.dispatchEvent(new Event('scroll'));
            vi.advanceTimersToNextTimer();
        });
        expect(layer.dataset.inView).toBe('true');
    });

    it('starts a canvas effect on screen and stops it off screen', () => {
        const { getByTestId } = render(<Layer effect={effect('canvasSnow')} />);
        const layer = getByTestId('layer');
        placeElement(layer, 2000);
        expect(mocks.createCanvasEffect).not.toHaveBeenCalled();

        act(() => io.show(layer));
        expect(mocks.createCanvasEffect).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 'canvasSnow', { speed: 'slow', intensity: 'subtle' });
        expect(mocks.controller.start).toHaveBeenCalledTimes(1);
        expect(mocks.controller.stop).not.toHaveBeenCalled();

        act(() => io.show(layer, false));
        expect(mocks.controller.stop).toHaveBeenCalledTimes(1);
    });

    it('stops everything when it leaves the page', () => {
        const { getByTestId, unmount } = render(<Layer effect={effect('canvasSnow')} />);
        act(() => io.show(getByTestId('layer')));
        unmount();
        expect(mocks.controller.stop).toHaveBeenCalledTimes(1);
        expect(io.count()).toBe(0);
    });

    it('reveals a fade each time it comes on screen, at the old timing', () => {
        const { getByTestId } = render(<Layer effect={effect('fade')} />);
        const layer = getByTestId('layer');
        const background = getByTestId('background');
        placeElement(layer, 2000);

        act(() => io.show(layer));
        expect(mocks.animate).toHaveBeenCalledWith(background, { opacity: [0, 1] }, { duration: 1.35, ease: [0.25, 0.1, 0.25, 1] });

        background.style.opacity = '1';
        act(() => io.show(layer, false));
        expect(mocks.playback.cancel).toHaveBeenCalledTimes(1);
        expect(background.style.opacity).toBe('');

        act(() => io.show(layer));
        expect(mocks.animate).toHaveBeenCalledTimes(2);
    });

    it('starts no canvas and no reveal for an effect of neither kind', () => {
        const { getByTestId } = render(<Layer effect={effect('slowZoom')} />);
        act(() => io.show(getByTestId('layer')));
        expect(mocks.createCanvasEffect).not.toHaveBeenCalled();
        expect(mocks.animate).not.toHaveBeenCalled();
    });

    it('never runs for someone who prefers less motion', () => {
        mocks.reduce = true;
        const { getByTestId } = render(<Layer effect={effect('canvasSnow')} />);
        expect(io.count()).toBe(0);
        expect(getByTestId('layer').dataset.inView).toBe('false');
        expect(mocks.createCanvasEffect).not.toHaveBeenCalled();
    });
});
