import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWishEditor } from '@/hooks/useWishEditor';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

const editMutate = vi.fn();
const deleteMutate = vi.fn();
const editReset = vi.fn();
vi.mock('@/hooks/useWishbook', () => ({
    useEditWishbookEntry: () => ({ mutateAsync: editMutate, isPending: false, error: null, reset: editReset }),
    useDeleteWishbookEntry: () => ({ mutateAsync: deleteMutate, isPending: false, error: null, reset: vi.fn() }),
}));

const entry: WishbookEntryResponseDto = {
    id: 'w1',
    eventId: 'e1',
    authorMemberId: 'm1',
    guestName: 'Me',
    message: 'Hello',
    createdAt: '2026-11-16T10:00:00Z',
    audio: null,
    canDelete: true,
    highlighted: null,
};

describe('useWishEditor', () => {
    beforeEach(() => {
        editMutate.mockReset().mockResolvedValue({});
        deleteMutate.mockReset().mockResolvedValue(undefined);
        editReset.mockReset();
    });

    it('opens on a wish with its text as the draft', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));

        expect(result.current.isSheetOpen).toBe(true);
        expect(result.current.draft).toBe('Hello');
        expect(editReset).toHaveBeenCalled();
    });

    it('saves the trimmed draft and closes', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.changeDraft('  Hello again  '));

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hello again' });
        expect(result.current.isSheetOpen).toBe(false);
    });

    it('keeps the sheet open when saving fails', async () => {
        editMutate.mockRejectedValue(new Error('nope'));
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));

        await act(() => result.current.save());

        expect(result.current.isSheetOpen).toBe(true);
    });

    it('cannot save an empty or unchanged draft', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.changeDraft('   '));
        expect(result.current.canSave).toBe(false);

        act(() => result.current.changeDraft('Changed'));
        expect(result.current.canSave).toBe(true);
    });

    it('swaps the sheet for the delete confirmation and back', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.changeDraft('Draft kept'));

        act(() => result.current.askDelete());
        expect(result.current.isSheetOpen).toBe(false);
        expect(result.current.isConfirmingDelete).toBe(true);

        act(() => result.current.cancelDelete());
        expect(result.current.isSheetOpen).toBe(true);
        expect(result.current.draft).toBe('Draft kept');
    });

    it('deletes the wish and closes everything', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.askDelete());

        await act(() => result.current.confirmDelete());

        expect(deleteMutate).toHaveBeenCalledWith('w1');
        expect(result.current.isSheetOpen).toBe(false);
        expect(result.current.isConfirmingDelete).toBe(false);
    });
});
