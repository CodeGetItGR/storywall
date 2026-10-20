import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyRoleSheet } from '@/hooks/useMyRoleSheet';

const vendor = vi.hoisted(() => ({ value: { data: null as unknown, isLoading: false }, eventId: vi.fn() }));
const prompt = vi.hoisted(() => ({ active: vi.fn() }));
const nav = vi.hoisted(() => ({ search: '' }));
const host = vi.hoisted(() => ({ value: false }));
const url = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => '/events/e1/feed', useSearchParams: () => new URLSearchParams(nav.search) }));
vi.mock('@/hooks/useVendors', () => ({
    useMyVendorRole: (eventId: string | null) => {
        vendor.eventId(eventId);
        return vendor.value;
    },
}));
vi.mock('@/hooks/useRolePromptOnce', () => ({ useRolePromptOnce: (args: { active: boolean }) => prompt.active(args.active) }));
vi.mock('@/lib/overlayHistory', () => ({
    replacePageUrl: (next: string) => {
        url.replace(next);
        nav.search = '';
    },
}));
vi.mock('@/lib/memberRoles', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/memberRoles')>()),
    canEditOwnRole: () => true,
}));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'e1' }),
    useActiveMember: () => ({ id: 'm1', relationshipRole: null, customRelationshipRole: null }),
    useContentAccessMode: () => 'member',
    useEventContextLoading: () => false,
    useIsHost: () => host.value,
}));

beforeEach(() => {
    prompt.active.mockReset();
    vendor.eventId.mockReset();
    url.replace.mockReset();
    vendor.value = { data: null, isLoading: false };
    host.value = false;
    nav.search = '';
});

describe('useMyRoleSheet role prompt', () => {
    it('is active for a guest without a role', () => {
        renderHook(() => useMyRoleSheet());
        expect(prompt.active).toHaveBeenLastCalledWith(true);
    });

    it('is never active for a vendor', () => {
        vendor.value = { data: { vendorType: 'MUSIC' }, isLoading: false };
        renderHook(() => useMyRoleSheet());
        expect(prompt.active).toHaveBeenLastCalledWith(false);
    });

    it('waits while the vendor role is loading', () => {
        vendor.value = { data: undefined, isLoading: true };
        renderHook(() => useMyRoleSheet());
        expect(prompt.active).toHaveBeenLastCalledWith(false);
    });
});

describe('useMyRoleSheet vendor role query', () => {
    it('asks for the guest event', () => {
        renderHook(() => useMyRoleSheet());
        expect(vendor.eventId).toHaveBeenLastCalledWith('e1');
    });

    it('does not ask for a host', () => {
        host.value = true;
        renderHook(() => useMyRoleSheet());
        expect(vendor.eventId).toHaveBeenLastCalledWith(null);
    });
});

describe('useMyRoleSheet ?sheet=role', () => {
    it('opens the sheet for a guest once the param is gone', () => {
        nav.search = 'sheet=role';
        const { result, rerender } = renderHook(() => useMyRoleSheet());
        act(() => rerender());
        expect(url.replace).toHaveBeenCalled();
        expect(result.current.open).toBe(true);
    });

    it('drops the param without opening the sheet for a vendor', () => {
        nav.search = 'sheet=role';
        vendor.value = { data: { vendorType: 'MUSIC' }, isLoading: false };
        const { result, rerender } = renderHook(() => useMyRoleSheet());
        act(() => rerender());
        expect(url.replace).toHaveBeenCalled();
        expect(result.current.open).toBe(false);
    });

    it('waits for the vendor check before consuming the param', () => {
        nav.search = 'sheet=role';
        vendor.value = { data: undefined, isLoading: true };
        const { result } = renderHook(() => useMyRoleSheet());
        expect(url.replace).not.toHaveBeenCalled();
        expect(result.current.open).toBe(false);
    });
});
