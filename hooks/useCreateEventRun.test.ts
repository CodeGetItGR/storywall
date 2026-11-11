import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventRun } from '@/hooks/useCreateEventRun';
import { writeCreateEventWizardDraft } from '@/lib/createEventWizardDraft';

const nav = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
});

describe('useCreateEventRun', () => {
    it('adds a run id after the mount, keeping the step and the linked type, plan and duration', () => {
        nav.search = 'step=details&type=baby-shower&plan=START&option=o3&code=SUMMER27';
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
        expect(params.get('code')).toBe('SUMMER27');
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

    it('in the wizard, adds the run to the current URL and keeps the page', () => {
        nav.search = 'create=1&type=baptism';
        window.history.replaceState(null, '', `/el?${nav.search}`);

        renderHook(() => useCreateEventRun('wizard'));
        act(() => vi.runAllTimers());

        const params = new URLSearchParams(window.location.search);
        expect(window.location.pathname).toBe('/el');
        expect(params.get('create')).toBe('1');
        expect(params.get('type')).toBe('baptism');
        expect(params.get('run')).toMatch(/\w+/);
    });

    it('in the wizard, resumes the saved run', () => {
        writeCreateEventWizardDraft({
            run: 'saved1', step: 'details', eventType: 'WEDDING', planCode: '', durationPicks: {}, title: 'Our wedding', startAt: '',
            timezone: '', locationName: '', locationAddress: '', mapsUrl: '', themePresetId: null,
            gift: { isGift: false, details: { recipientLabel: '', giverDisplayName: '', recipientEmail: '' } }, checkoutCode: '',
        });
        nav.search = 'create=1';
        window.history.replaceState(null, '', '/?create=1');

        renderHook(() => useCreateEventRun('wizard'));
        act(() => vi.runAllTimers());

        expect(new URLSearchParams(window.location.search).get('run')).toBe('saved1');
    });
});
