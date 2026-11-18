import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEditorTour } from '@/hooks/useEditorTour';
import { EDITOR_TOUR_DELAY_MS, EDITOR_TOUR_SEEN_KEY, EDITOR_TOUR_STEPS } from '@/lib/invitation/editorTour';

describe('useEditorTour', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.removeItem(EDITOR_TOUR_SEEN_KEY);
    });
    afterEach(() => vi.useRealTimers());

    it('opens by itself after a moment the first time, and marks it seen then', () => {
        const { result } = renderHook(() => useEditorTour());
        expect(result.current.isOpen).toBe(false);
        expect(localStorage.getItem(EDITOR_TOUR_SEEN_KEY)).toBeNull();

        act(() => vi.advanceTimersByTime(EDITOR_TOUR_DELAY_MS));

        expect(result.current.step?.id).toBe('welcome');
        expect(result.current.isFirst).toBe(true);
        expect(localStorage.getItem(EDITOR_TOUR_SEEN_KEY)).toBe('1');
    });

    it('stays closed once seen', () => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        const { result } = renderHook(() => useEditorTour());
        act(() => vi.advanceTimersByTime(EDITOR_TOUR_DELAY_MS * 2));
        expect(result.current.isOpen).toBe(false);
    });

    it('is not marked seen when the editor closes before it shows', () => {
        const { unmount } = renderHook(() => useEditorTour());
        unmount();
        act(() => vi.advanceTimersByTime(EDITOR_TOUR_DELAY_MS));
        expect(localStorage.getItem(EDITOR_TOUR_SEEN_KEY)).toBeNull();
    });

    it('steps forward and back, and closes after the last step', () => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        const { result } = renderHook(() => useEditorTour());
        act(() => result.current.start());

        act(() => result.current.back());
        expect(result.current.index).toBe(0);

        for (let step = 1; step < EDITOR_TOUR_STEPS.length; step += 1) act(() => result.current.next());
        expect(result.current.isLast).toBe(true);
        expect(result.current.step?.id).toBe('publish');

        act(() => result.current.back());
        expect(result.current.step?.id).toBe('sectionTools');

        act(() => result.current.next());
        act(() => result.current.next());
        expect(result.current.isOpen).toBe(false);
    });

    it('closes on skip and starts again from the first step', () => {
        localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
        const { result } = renderHook(() => useEditorTour());
        act(() => result.current.start());
        act(() => result.current.next());
        act(() => result.current.close());
        expect(result.current.isOpen).toBe(false);

        act(() => result.current.start());
        expect(result.current.step?.id).toBe('welcome');
    });
});
