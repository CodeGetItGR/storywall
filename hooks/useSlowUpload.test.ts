import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SLOW_UPLOAD_DELAY_MS, useSlowUpload } from './useSlowUpload';

describe('useSlowUpload', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stays false while idle', () => {
        const { result } = renderHook(() => useSlowUpload(false));
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS * 2);
        });
        expect(result.current).toBe(false);
    });

    it('turns true once an upload runs past the delay', () => {
        const { result } = renderHook(() => useSlowUpload(true));
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS - 1);
        });
        expect(result.current).toBe(false);
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current).toBe(true);
    });

    it('resets when the upload ends, so the next one starts fresh', () => {
        const { result, rerender } = renderHook(({ active }) => useSlowUpload(active), { initialProps: { active: true } });
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS);
        });
        expect(result.current).toBe(true);

        rerender({ active: false });
        expect(result.current).toBe(false);

        rerender({ active: true });
        expect(result.current).toBe(false);
        act(() => {
            vi.advanceTimersByTime(SLOW_UPLOAD_DELAY_MS);
        });
        expect(result.current).toBe(true);
    });
});
