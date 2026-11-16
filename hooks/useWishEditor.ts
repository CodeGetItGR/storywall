'use client';

import { useState } from 'react';

import { useDeleteWishbookEntry, useEditWishbookEntry } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

// State for the sheet a guest opens on one of their own wishes: edit its text, or delete it.
// The delete confirmation replaces the sheet while it is open; cancelling brings the sheet back.
export function useWishEditor(eventId: string) {
    const [selected, setSelected] = useState<WishbookEntryResponseDto | null>(null);
    const [draft, setDraft] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const edit = useEditWishbookEntry(eventId);
    const remove = useDeleteWishbookEntry(eventId);

    const trimmed = draft.trim();
    const canSave = Boolean(selected) && trimmed.length > 0 && trimmed !== selected?.message && !edit.isPending;

    function open(entry: WishbookEntryResponseDto) {
        edit.reset();
        setSelected(entry);
        setDraft(entry.message ?? '');
        setIsConfirmingDelete(false);
    }
    function close() {
        setSelected(null);
        setIsConfirmingDelete(false);
    }
    async function save() {
        if (!selected || !canSave) return;
        try {
            await edit.mutateAsync({ entryId: selected.id, message: trimmed });
        } catch {
            return; // edit.error shows in the sheet; keep what was typed
        }
        close();
    }
    async function confirmDelete() {
        if (!selected) return;
        await remove.mutateAsync(selected.id);
        close();
    }

    return {
        draft,
        changeDraft: setDraft,
        canSave,
        isSaving: edit.isPending,
        saveError: edit.error,
        isSheetOpen: Boolean(selected) && !isConfirmingDelete,
        isConfirmingDelete,
        isDeleting: remove.isPending,
        open,
        close,
        save,
        askDelete: () => setIsConfirmingDelete(true),
        cancelDelete: () => setIsConfirmingDelete(false),
        confirmDelete,
    };
}

export type WishEditor = ReturnType<typeof useWishEditor>;
