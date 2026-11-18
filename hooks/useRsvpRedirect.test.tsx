import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpRedirect } from '@/hooks/useRsvpRedirect';

const mocks = vi.hoisted(() => ({ replace: vi.fn(), available: true }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/hooks/useRsvpAvailability', () => ({
    useRsvpAvailability: () => ({ isAvailable: mocks.available, unavailableTitle: 'title', unavailableBody: 'body' }),
}));

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.available = true;
});

describe('useRsvpRedirect', () => {
    it('sends the host to the RSVP page in the dashboard', () => {
        renderHook(() => useRsvpRedirect('e1'));
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/manage?tab=rsvp');
    });

    it('stays put when the plan has no RSVP, so the not-available screen shows', () => {
        mocks.available = false;
        const { result } = renderHook(() => useRsvpRedirect('e1'));
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(result.current.isAvailable).toBe(false);
    });
});
