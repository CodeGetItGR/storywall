import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransientValue } from '@/hooks/useTransientValue';

describe('useTransientValue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a value and clears it once the duration has passed', () => {
        const { result } = renderHook(() => useTransientValue<string>(1000));
        expect(result.current.value).toBeNull();

        act(() => result.current.show('warm'));
        expect(result.current.value).toBe('warm');

        act(() => vi.advanceTimersByTime(999));
        expect(result.current.value).toBe('warm');

        act(() => vi.advanceTimersByTime(1));
        expect(result.current.value).toBeNull();
    });

    it('restarts the timer when a new value is shown', () => {
        const { result } = renderHook(() => useTransientValue<string>(1000));

        act(() => result.current.show('warm'));
        act(() => vi.advanceTimersByTime(600));
        act(() => result.current.show('noir'));
        act(() => vi.advanceTimersByTime(600));
        expect(result.current.value).toBe('noir');

        act(() => vi.advanceTimersByTime(400));
        expect(result.current.value).toBeNull();
    });

    it('clears right away and cancels the pending timer', () => {
        const { result } = renderHook(() => useTransientValue<string>(1000));

        act(() => result.current.show('warm'));
        act(() => result.current.clear());

        expect(result.current.value).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('cancels the pending timer on unmount', () => {
        const { result, unmount } = renderHook(() => useTransientValue<string>(1000));

        act(() => result.current.show('warm'));
        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
