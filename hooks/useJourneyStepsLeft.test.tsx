import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useJourneyStepsLeft } from '@/hooks/useJourneyStepsLeft';

vi.mock('@/hooks/useHelpProgress', () => ({
    useHelpProgress: () => ({ details: true, rsvp: false, giftAccount: false, schedule: true, invitations: false }),
}));

const event = {
    id: 'e1',
    title: 'Nick and Maria',
    status: 'ACTIVE',
    sessions: [],
    location: { name: 'Venue', address: 'Street 1' },
    schedule: { startAt: '2099-06-12T16:00:00Z', endAt: '2099-06-12T23:00:00Z', timezone: 'Europe/Athens' },
    modules: [
        { moduleKey: 'posts', isEnabled: true, isAvailable: true },
        { moduleKey: 'rsvp', isEnabled: true, isAvailable: true },
    ],
} as never;

describe('useJourneyStepsLeft', () => {
    it('counts the Before stops not done', () => {
        const { result } = renderHook(() => useJourneyStepsLeft(event));
        // RSVP and invitations; no wishlist module, so no gift stop.
        expect(result.current).toBe(2);
    });
});
