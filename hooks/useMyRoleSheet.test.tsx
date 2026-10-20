import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMyRoleSheet } from '@/hooks/useMyRoleSheet';

const vendor = vi.hoisted(() => ({ value: { data: null as unknown, isLoading: false } }));
const prompt = vi.hoisted(() => ({ active: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => '/events/e1/feed', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/useVendors', () => ({ useMyVendorRole: () => vendor.value }));
vi.mock('@/hooks/useRolePromptOnce', () => ({ useRolePromptOnce: (args: { active: boolean }) => prompt.active(args.active) }));
vi.mock('@/lib/memberRoles', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/memberRoles')>()),
    canEditOwnRole: () => true,
}));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ id: 'e1' }),
    useActiveMember: () => ({ id: 'm1', relationshipRole: null, customRelationshipRole: null }),
    useContentAccessMode: () => 'member',
    useEventContextLoading: () => false,
}));

beforeEach(() => {
    prompt.active.mockReset();
    vendor.value = { data: null, isLoading: false };
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
