import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingMotionProvider, useLandingMotion } from '@/providers/LandingMotionProvider';

const STORAGE_KEY = 'storywall:landing-motion-paused';

function wrapper({ children }: { children: ReactNode }) {
    return <LandingMotionProvider>{children}</LandingMotionProvider>;
}

afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
});

describe('useLandingMotion', () => {
    it('starts playing when nothing is stored', () => {
        const { result } = renderHook(() => useLandingMotion(), { wrapper });
        expect(result.current.paused).toBe(false);
    });

    it('pauses on toggle and records the choice for the rest of the session', () => {
        const { result } = renderHook(() => useLandingMotion(), { wrapper });
        act(() => result.current.toggle());
        expect(result.current.paused).toBe(true);
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('resumes on a second toggle', () => {
        const { result } = renderHook(() => useLandingMotion(), { wrapper });
        act(() => result.current.toggle());
        act(() => result.current.toggle());
        expect(result.current.paused).toBe(false);
        expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('comes back paused for a visitor who paused earlier in the session', () => {
        window.sessionStorage.setItem(STORAGE_KEY, 'true');
        const { result } = renderHook(() => useLandingMotion(), { wrapper });
        expect(result.current.paused).toBe(true);
    });

    it('keeps working when the browser denies storage', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });
        const { result } = renderHook(() => useLandingMotion(), { wrapper });
        expect(result.current.paused).toBe(false);
        act(() => result.current.toggle());
        expect(result.current.paused).toBe(true);
    });

    it('gives every consumer under the provider the same value', () => {
        const { result } = renderHook(() => [useLandingMotion(), useLandingMotion()] as const, { wrapper });
        const [header] = result.current;
        act(() => header.toggle());
        expect(result.current.map((consumer) => consumer.paused)).toEqual([true, true]);
    });
});
