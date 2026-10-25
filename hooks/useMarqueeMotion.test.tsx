import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarqueeMotion } from '@/hooks/useMarqueeMotion';
import { LandingMotionProvider, useLandingMotion } from '@/providers/LandingMotionProvider';

const frame = vi.hoisted(() => ({ callback: null as ((time: number, delta: number) => void) | null, reduce: false }));

vi.mock('framer-motion', async (importOriginal) => ({
    ...(await importOriginal<typeof import('framer-motion')>()),
    useAnimationFrame: (callback: (time: number, delta: number) => void) => {
        frame.callback = callback;
    },
    useReducedMotion: () => frame.reduce,
}));

const wrapper = ({ children }: { children: ReactNode }) => <LandingMotionProvider>{children}</LandingMotionProvider>;

function tick(ms: number) {
    act(() => frame.callback?.(0, ms));
}

beforeEach(() => {
    frame.reduce = false;
    window.sessionStorage.clear();
});

afterEach(() => {
    frame.callback = null;
});

describe('useMarqueeMotion', () => {
    it('moves half the track in the given time, then starts over', () => {
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        tick(12000);
        expect(result.current.x.get()).toBe('-12.5%');
        tick(36000);
        expect(result.current.x.get()).toBe('0%');
    });

    it('stops while hovered', () => {
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        act(() => result.current.onPointerEnter());
        tick(12000);
        expect(result.current.x.get()).toBe('0%');
        act(() => result.current.onPointerLeave());
        tick(12000);
        expect(result.current.x.get()).toBe('-12.5%');
    });

    it('stands still for reduced motion', () => {
        frame.reduce = true;
        const { result } = renderHook(() => useMarqueeMotion(48), { wrapper });
        tick(12000);
        expect(result.current.still).toBe(true);
        expect(result.current.x.get()).toBe('0%');
    });

    it('stands still while landing motion is paused', () => {
        const { result } = renderHook(() => ({ marquee: useMarqueeMotion(48), motion: useLandingMotion() }), { wrapper });
        act(() => result.current.motion.toggle());
        tick(12000);
        expect(result.current.marquee.still).toBe(true);
        expect(result.current.marquee.x.get()).toBe('0%');
    });
});
