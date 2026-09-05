import confetti from 'canvas-confetti';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FIREWORKS_DURATION_MS, runFireworks } from '@/lib/fireworks';

vi.mock('canvas-confetti', () => {
    const createInstance = vi.fn(() => Object.assign(vi.fn(), { reset: vi.fn() }));
    return {
        default: Object.assign(vi.fn(), { create: createInstance }),
    };
});

describe('runFireworks', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        vi.useFakeTimers();
        canvas = document.createElement('canvas');
        vi.mocked(confetti.create).mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('creates a confetti instance scoped to the given canvas', () => {
        runFireworks(canvas);
        expect(confetti.create).toHaveBeenCalledWith(canvas, { resize: true, useWorker: true });
    });

    it('fires more than one burst over the animation duration', () => {
        const instance = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(instance, { reset: vi.fn() }));

        runFireworks(canvas);
        vi.advanceTimersByTime(FIREWORKS_DURATION_MS);

        expect(instance.mock.calls.length).toBeGreaterThan(1);
    });

    it('stops firing once the returned cleanup function is called', () => {
        const instance = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(instance, { reset: vi.fn() }));

        const stop = runFireworks(canvas);
        vi.advanceTimersByTime(300);
        const callsBeforeStop = instance.mock.calls.length;

        stop();
        vi.advanceTimersByTime(FIREWORKS_DURATION_MS);

        expect(instance.mock.calls.length).toBe(callsBeforeStop);
    });

    it('calls reset on the confetti instance when stopped', () => {
        const resetFn = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(vi.fn(), { reset: resetFn }));

        const stop = runFireworks(canvas);
        stop();

        expect(resetFn).toHaveBeenCalledTimes(1);
    });
});
