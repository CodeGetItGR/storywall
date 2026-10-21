import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCanEditSchedule } from '@/hooks/useCanEditSchedule';

const vendor = vi.hoisted(() => ({ allowed: false, askedFor: undefined as string | null | undefined, capability: undefined as string | undefined }));
vi.mock('@/hooks/useVendors', () => ({
    useHasVendorCapability: (eventId: string | null, capability: string) => {
        vendor.askedFor = eventId;
        vendor.capability = capability;
        return { allowed: vendor.allowed, isLoading: false };
    },
}));

describe('useCanEditSchedule', () => {
    it('lets a host edit without asking about vendors', () => {
        expect(renderHook(() => useCanEditSchedule('e1', true)).result.current).toBe(true);
        expect(vendor.askedFor).toBeNull();
    });

    it('lets a planner with open access edit', () => {
        vendor.allowed = true;
        expect(renderHook(() => useCanEditSchedule('e1', false)).result.current).toBe(true);
        expect(vendor.askedFor).toBe('e1');
        expect(vendor.capability).toBe('SCHEDULE_EDIT');
    });

    it('keeps everyone else read-only', () => {
        vendor.allowed = false;
        expect(renderHook(() => useCanEditSchedule('e1', false)).result.current).toBe(false);
    });
});
