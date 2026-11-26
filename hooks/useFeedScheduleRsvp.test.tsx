import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedScheduleRsvp } from '@/hooks/useFeedScheduleRsvp';
import type { EventDetailResponseDto } from '@/lib/api/types';

const viewer = vi.hoisted(() => ({
    isHost: false,
    member: null as { id: string; rsvpId: string | null } | null,
    vendor: { isLoading: false, data: null as object | null },
    rsvp: { isLoading: false, data: undefined as { attendanceStatus: string } | undefined },
    responses: { isLoading: false, data: undefined as object[] | undefined },
}));
vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => viewer.isHost, useActiveMember: () => viewer.member }));
vi.mock('@/hooks/useVendors', () => ({ useMyVendorRole: () => viewer.vendor }));
vi.mock('@/hooks/useRsvps', () => ({ useRsvp: () => viewer.rsvp, useRsvpSessionResponses: () => viewer.responses }));

afterEach(() => {
    viewer.isHost = false;
    viewer.member = null;
    viewer.vendor = { isLoading: false, data: null };
    viewer.rsvp = { isLoading: false, data: undefined };
    viewer.responses = { isLoading: false, data: undefined };
});

const eventWith = (...keys: string[]) =>
    ({ id: 'e-1', modules: keys.map((moduleKey) => ({ moduleKey, isAvailable: true })) }) as unknown as EventDetailResponseDto;
const linkFor = (event = eventWith('rsvp', 'schedule')) => renderHook(() => useFeedScheduleRsvp(event)).result.current;

describe('useFeedScheduleRsvp', () => {
    it("links a member to the form on that session, with their answer once they've given one", () => {
        viewer.member = { id: 'm', rsvpId: null };
        expect(linkFor()?.('church')).toEqual({ answer: null, href: '/events/e-1/tools/rsvp/submit?session=church' });

        viewer.member = { id: 'm', rsvpId: 'r' };
        viewer.rsvp = { isLoading: false, data: { attendanceStatus: 'ATTENDING' } };
        viewer.responses = { isLoading: false, data: [{ eventSessionId: 'church', isAttending: true }] };
        expect(linkFor()?.('church').answer).toBe('attending');
        expect(linkFor()?.('party').answer).toBeNull();
    });

    it("is null while the guest's RSVP or role is loading", () => {
        viewer.member = { id: 'm', rsvpId: 'r' };
        viewer.responses = { isLoading: true, data: undefined };
        expect(linkFor()).toBeNull();
        viewer.responses = { isLoading: false, data: [] };
        viewer.vendor = { isLoading: true, data: null };
        expect(linkFor()).toBeNull();
    });

    it("is null for whom the RSVP form isn't", () => {
        expect(linkFor()).toBeNull();
        viewer.member = { id: 'm', rsvpId: null };
        expect(linkFor(eventWith('rsvp'))).toBeNull();
        expect(linkFor(eventWith('schedule'))).toBeNull();
        viewer.vendor = { isLoading: false, data: { vendorType: 'DJ' } };
        expect(linkFor()).toBeNull();
        viewer.vendor = { isLoading: false, data: null };
        viewer.isHost = true;
        expect(linkFor()).toBeNull();
    });
});
