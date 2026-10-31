import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VendorMeDto } from '@/lib/api/types';

const remove = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
vi.mock('@/hooks/useSneakPeek', () => ({
    useCreateSneakPeek: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateSneakPeek: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteSneakPeek: () => remove,
}));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'Your access has ended.' }));
vi.mock('@/hooks/useMedia', () => ({ useEventMedia: () => ({ data: undefined, hasNextPage: false, fetchNextPage: vi.fn() }) }));
vi.mock('@/hooks/useModuleReadable', () => ({ useModuleReadable: () => true }));
vi.mock('@/providers/EventProvider', () => ({
    useActiveEvent: () => ({ schedule: { startAt: '2026-01-01T00:00:00Z' } }),
    useActiveMember: () => ({ id: 'm1' }),
}));

import { useSneakPeekSection } from '@/hooks/useSneakPeekSection';

const ME = {
    vendorId: 'v1',
    capabilities: ['SNEAK_PEEK'],
    sneakPeek: { postId: 'p1', mediaIds: ['m1'], content: null, used: true },
} as unknown as VendorMeDto;

describe('useSneakPeekSection delete', () => {
    beforeEach(() => vi.clearAllMocks());

    it('closes the dialog after a delete', async () => {
        remove.mutateAsync.mockResolvedValue(undefined);
        const { result } = renderHook(() => useSneakPeekSection('e1', ME, true));

        act(() => result.current.requestDelete());
        await act(() => result.current.confirmRemove());

        expect(result.current.confirmDelete).toBe(false);
        expect(result.current.deleteError).toBeNull();
    });

    it('keeps the dialog open with the reason when the delete fails', async () => {
        remove.mutateAsync.mockRejectedValue(new Error('403'));
        const { result } = renderHook(() => useSneakPeekSection('e1', ME, true));

        act(() => result.current.requestDelete());
        await act(() => result.current.confirmRemove());

        expect(result.current.confirmDelete).toBe(true);
        expect(result.current.deleteError).toBe('Your access has ended.');

        act(() => result.current.cancelDelete());
        act(() => result.current.requestDelete());
        expect(result.current.deleteError).toBeNull();
    });
});
