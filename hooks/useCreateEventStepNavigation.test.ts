import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventStepNavigation } from '@/hooks/useCreateEventStepNavigation';
import { wizardDepth } from '@/lib/createEventWizardHistory';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
});

describe('useCreateEventStepNavigation', () => {
    it('keeps the old flow on the router and /events/new', () => {
        const { result } = renderHook(() => useCreateEventStepNavigation('legacy', 'r1'));
        result.current.push('plan');
        result.current.replace('details');
        expect(router.push).toHaveBeenCalledWith('/events/new?step=plan&run=r1', { scroll: false });
        expect(router.replace).toHaveBeenCalledWith('/events/new?step=details&run=r1');
    });

    it('moves the wizard on the current URL without the router', () => {
        window.history.replaceState(null, '', '/el?create=1&type=baptism');
        const { result } = renderHook(() => useCreateEventStepNavigation('wizard', 'r1'));
        result.current.push('plan');
        expect(`${window.location.pathname}${window.location.search}`).toBe('/el?create=1&type=baptism&step=plan&run=r1');
        expect(wizardDepth()).toBe(1);
        result.current.replace('details');
        expect(window.location.search).toBe('?create=1&type=baptism&step=details&run=r1');
        expect(wizardDepth()).toBe(1);
        expect(router.push).not.toHaveBeenCalled();
    });
});
