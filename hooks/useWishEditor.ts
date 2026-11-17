'use client';

import { useState } from 'react';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useDeleteWishbookEntry, useEditWishbookEntry } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

// State for the sheet a guest opens on one of their own wishes: edit its text, change or remove its
// recording, or delete it. The delete confirmation replaces the sheet while it is open; cancelling
// brings the sheet back.
export function useWishEditor(eventId: string) {
    const [selected, setSelected] = useState<WishbookEntryResponseDto | null>(null);
    const [draft, setDraft] = useState('');
    const [removedExisting, setRemovedExisting] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const edit = useEditWishbookEntry(eventId);
    const remove = useDeleteWishbookEntry(eventId);
    const recorder = useVoiceRecorder();

    // The stored recording stays until the guest removes it; a finished new one replaces it on save.
    const existingAudio = selected?.audio && !removedExisting ? selected.audio : null;
    const newAudio = recorder.status === 'recorded' ? (recorder.recording?.blob ?? null) : null;
    const removesAudio = removedExisting && Boolean(selected?.audio) && newAudio === null;
    const trimmed = draft.trim();
    const textChanged = trimmed !== (selected?.message ?? '');
    const audioChanged = newAudio !== null || removesAudio;
    // Blank text is fine while the wish keeps or gets a recording; the server refuses a wish with neither.
    const hasContent = trimmed !== '' || newAudio !== null || existingAudio !== null;
    const canSave =
        Boolean(selected) && hasContent && (textChanged || audioChanged) && recorder.status !== 'recording' && !edit.isPending;

    function open(entry: WishbookEntryResponseDto) {
        edit.reset();
        recorder.discard();
        setRemovedExisting(false);
        setSelected(entry);
        setDraft(entry.message ?? '');
        setIsConfirmingDelete(false);
    }
    function close() {
        // Frees the microphone and the unsent recording.
        recorder.discard();
        setSelected(null);
        setIsConfirmingDelete(false);
    }
    async function save() {
        if (!selected || !canSave) return;
        try {
            await edit.mutateAsync({
                entryId: selected.id,
                message: trimmed,
                ...(newAudio ? { audio: newAudio } : removesAudio ? { removeAudio: true } : {}),
            });
        } catch {
            return; // edit.error shows in the sheet; keep what was typed and recorded
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
        recorder,
        existingAudio,
        removeExisting: () => setRemovedExisting(true),
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
