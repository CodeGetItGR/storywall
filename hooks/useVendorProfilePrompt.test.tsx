import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVendorProfilePrompt } from '@/hooks/useVendorProfilePrompt';

const role = vi.hoisted(() => ({ data: null as null | undefined | { vendorType: string; profileComplete: boolean } }));
vi.mock('@/hooks/useVendors', () => ({ useMyVendorRole: () => ({ data: role.data }) }));
vi.mock('@/hooks/useVendorProfile', () => ({ useVendorProfile: () => ({ data: null }) }));

beforeEach(() => {
    role.data = null;
});

describe('useVendorProfilePrompt', () => {
    it('opens for a vendor without a profile, on their type', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: false };
        const { result } = renderHook(() => useVendorProfilePrompt('e1'));
        expect(result.current.open).toBe(true);
        expect(result.current.defaultType).toBe('MUSIC');
    });

    it('stays closed for a vendor with a profile and for everyone else', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: true };
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(false);
        role.data = null;
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(false);
    });

    it('stays closed while the vendor role is loading', () => {
        role.data = undefined;
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(false);
    });

    it('"Later" closes it for this visit only', () => {
        role.data = { vendorType: 'MUSIC', profileComplete: false };
        const { result } = renderHook(() => useVendorProfilePrompt('e1'));
        act(() => result.current.close());
        expect(result.current.open).toBe(false);
        expect(renderHook(() => useVendorProfilePrompt('e1')).result.current.open).toBe(true);
    });
});
