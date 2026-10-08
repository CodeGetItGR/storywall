import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventRun } from '@/hooks/useCreateEventRun';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
});

describe('useCreateEventRun', () => {
    it('adds a run id after the mount, keeping the step and the linked type, plan and duration', () => {
        nav.search = 'step=details&type=baby-shower&plan=START&option=o3';
        window.history.replaceState(null, '', `/events/new?${nav.search}`);

        renderHook(() => useCreateEventRun());
        // Not in the mount's own effect pass: the Next router's history wrapper isn't installed yet.
        expect(new URLSearchParams(window.location.search).get('run')).toBeNull();

        act(() => vi.runAllTimers());
        const params = new URLSearchParams(window.location.search);
        expect(params.get('step')).toBe('details');
        expect(params.get('type')).toBe('baby-shower');
        expect(params.get('plan')).toBe('START');
        expect(params.get('option')).toBe('o3');
        expect(params.get('run')).toMatch(/\w+/);
    });

    it('drops a pending write when unmounted first, so a remount writes one run id', () => {
        nav.search = '';
        window.history.replaceState(null, '', '/events/new');
        const replaceState = vi.spyOn(window.history, 'replaceState');

        renderHook(() => useCreateEventRun()).unmount();
        renderHook(() => useCreateEventRun());
        act(() => vi.runAllTimers());

        expect(replaceState).toHaveBeenCalledTimes(1);
        replaceState.mockRestore();
    });
});
