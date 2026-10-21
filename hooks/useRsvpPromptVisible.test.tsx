import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRsvpPromptVisible } from '@/hooks/useRsvpPromptVisible';

const vendor = vi.hoisted(() => ({ value: { data: null as unknown, isLoading: false }, eventId: vi.fn() }));

vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: (eventId: string | null) => {
        vendor.eventId(eventId);
        return vendor.value;
    },
}));

const base = { eventId: 'e1', isHost: false, rsvpAvailable: true, rsvpId: null as string | null };

beforeEach(() => {
    vendor.value = { data: null, isLoading: false };
    vendor.eventId.mockReset();
});

describe('useRsvpPromptVisible', () => {
    it('is visible for a guest without an RSVP', () => {
        expect(renderHook(() => useRsvpPromptVisible(base)).result.current).toBe(true);
    });

    it('is hidden for a vendor', () => {
        vendor.value = { data: { vendorType: 'MUSIC' }, isLoading: false };
        expect(renderHook(() => useRsvpPromptVisible(base)).result.current).toBe(false);
    });

    it('is hidden while the vendor role is loading', () => {
        vendor.value = { data: undefined, isLoading: true };
        expect(renderHook(() => useRsvpPromptVisible(base)).result.current).toBe(false);
    });

    it('is hidden once the guest has an RSVP or the module is off', () => {
        expect(renderHook(() => useRsvpPromptVisible({ ...base, rsvpId: 'r1' })).result.current).toBe(false);
        expect(renderHook(() => useRsvpPromptVisible({ ...base, rsvpAvailable: false })).result.current).toBe(false);
    });

    it('is hidden for a host and never asks for the host role', () => {
        expect(renderHook(() => useRsvpPromptVisible({ ...base, isHost: true })).result.current).toBe(false);
        expect(vendor.eventId).toHaveBeenLastCalledWith(null);
    });
});
