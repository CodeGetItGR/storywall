import { afterEach, describe, expect, it, vi } from 'vitest';

const confetti = vi.hoisted(() => Object.assign(vi.fn(), { reset: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: confetti }));

import { fireCelebrationConfetti } from '@/lib/celebrationConfetti';

function motion(reduce: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce') }));
}

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    confetti.mockClear();
    confetti.reset.mockClear();
});

describe('fireCelebrationConfetti', () => {
    it('fires bursts and clears them on cleanup', () => {
        vi.useFakeTimers();
        motion(false);
        const stop = fireCelebrationConfetti();
        vi.runAllTimers();
        expect(confetti).toHaveBeenCalledTimes(3);
        stop();
        expect(confetti.reset).toHaveBeenCalled();
    });

    it('fires nothing with reduced motion', () => {
        motion(true);
        fireCelebrationConfetti();
        expect(confetti).not.toHaveBeenCalled();
    });
});
