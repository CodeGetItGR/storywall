import { renderHook } from '@testing-library/react';
import { track } from '@vercel/analytics';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFlowEvent } from '@/hooks/useFlowEvent';
import type { FlowEvent } from '@/lib/flowTracking';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

const details: FlowEvent = { name: 'Create Step', step: 'details', type: 'WEDDING' };
const plan: FlowEvent = { name: 'Create Step', step: 'plan', type: 'WEDDING' };

function setUpAnalytics() {
    Object.assign(window, { va: vi.fn() });
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(track).mockClear();
    setUpAnalytics();
});

afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, 'va');
});

describe('useFlowEvent', () => {
    it('sends nothing for null', () => {
        renderHook(() => useFlowEvent(null));
        vi.runAllTimers();

        expect(track).not.toHaveBeenCalled();
    });

    it('sends once across re-renders and Strict Mode', () => {
        const { rerender } = renderHook(() => useFlowEvent({ ...details }), { reactStrictMode: true });
        rerender();
        vi.runAllTimers();

        expect(track).toHaveBeenCalledTimes(1);
        expect(track).toHaveBeenCalledWith('Create Step', { step: 'details', type: 'WEDDING' });
    });

    it('sends again when the event changes, including going back to an earlier one', () => {
        const { rerender } = renderHook(({ event }) => useFlowEvent(event), { initialProps: { event: details } });
        rerender({ event: plan });
        rerender({ event: details });
        vi.runAllTimers();

        expect(track).toHaveBeenCalledTimes(3);
    });

    it('sends after the current effects, so the redaction for this page is in place', () => {
        renderHook(() => useFlowEvent(details));

        expect(track).not.toHaveBeenCalled();

        vi.advanceTimersByTime(0);

        expect(track).toHaveBeenCalledTimes(1);
    });

    it('waits for the analytics script to be set up', () => {
        Reflect.deleteProperty(window, 'va');
        renderHook(() => useFlowEvent(details));
        vi.advanceTimersByTime(1000);

        expect(track).not.toHaveBeenCalled();

        setUpAnalytics();
        vi.advanceTimersByTime(200);

        expect(track).toHaveBeenCalledTimes(1);
    });

    it('gives up when the analytics script never loads', () => {
        Reflect.deleteProperty(window, 'va');
        renderHook(() => useFlowEvent(details));
        vi.runAllTimers();

        expect(vi.getTimerCount()).toBe(0);
        expect(track).not.toHaveBeenCalled();
    });
});
