import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QR_INTRO_FADE_MS, QR_INTRO_MS, useQrIntro } from '@/hooks/useQrIntro';

// The intro over a scanned code's choices: shown each time, gone after a few seconds or on a tap.
describe('useQrIntro', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('fades out on its own after a few seconds', () => {
        const { result } = renderHook(() => useQrIntro(true));
        expect(result.current.isOpen).toBe(true);

        act(() => vi.advanceTimersByTime(QR_INTRO_MS));
        expect(result.current.isLeaving).toBe(true);

        act(() => vi.advanceTimersByTime(QR_INTRO_FADE_MS));
        expect(result.current.isOpen).toBe(false);
    });

    it('closes on a tap before the time is up', () => {
        const { result } = renderHook(() => useQrIntro(true));

        act(() => result.current.dismiss());
        act(() => vi.advanceTimersByTime(QR_INTRO_FADE_MS));
        expect(result.current.isOpen).toBe(false);
    });

    it('closes on Escape', () => {
        const { result } = renderHook(() => useQrIntro(true));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(result.current.isLeaving).toBe(true);
    });

    // Going back from a form to the choices doesn't bring it back.
    it('stays gone when the choices show again', () => {
        const { result, rerender } = renderHook(({ enabled }) => useQrIntro(enabled), { initialProps: { enabled: true } });
        act(() => vi.advanceTimersByTime(QR_INTRO_MS));
        act(() => vi.advanceTimersByTime(QR_INTRO_FADE_MS));

        rerender({ enabled: false });
        rerender({ enabled: true });
        expect(result.current.isOpen).toBe(false);
    });

    it('never shows when turned off', () => {
        const { result } = renderHook(() => useQrIntro(false));

        expect(result.current.isOpen).toBe(false);
    });
});
