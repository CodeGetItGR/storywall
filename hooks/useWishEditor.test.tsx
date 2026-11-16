import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { VoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useWishEditor } from '@/hooks/useWishEditor';
import type { WishbookEntryResponseDto } from '@/lib/api/types';

const editMutate = vi.fn();
const deleteMutate = vi.fn();
const editReset = vi.fn();
vi.mock('@/hooks/useWishbook', () => ({
    useEditWishbookEntry: () => ({ mutateAsync: editMutate, isPending: false, error: null, reset: editReset }),
    useDeleteWishbookEntry: () => ({ mutateAsync: deleteMutate, isPending: false, error: null, reset: vi.fn() }),
}));

let recorderState: VoiceRecorder;
vi.mock('@/hooks/useVoiceRecorder', () => ({ useVoiceRecorder: () => recorderState }));

function recorded() {
    recorderState.status = 'recorded';
    recorderState.recording = { blob: new Blob(['x'], { type: 'audio/webm' }), url: 'blob:x', durationMs: 3000 };
}

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
const voiceAndText: WishbookEntryResponseDto = { ...entry, audio: { url: 'https://cdn/w1.m4a', durationMs: 9000 } };
const voiceOnly: WishbookEntryResponseDto = { ...voiceAndText, message: null };

describe('useWishEditor', () => {
    beforeEach(() => {
        editMutate.mockReset().mockResolvedValue({});
        deleteMutate.mockReset().mockResolvedValue(undefined);
        editReset.mockReset();
        recorderState = { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn() };
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

    it('saves a new recording for a text wish', async () => {
        const { result, rerender } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        recorded();
        rerender();
        expect(result.current.canSave).toBe(true);

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hello', audio: recorderState.recording!.blob });
        expect(recorderState.discard).toHaveBeenCalled();
    });

    it('shows the stored recording until it is removed', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceAndText));
        expect(result.current.existingAudio).toEqual(voiceAndText.audio);

        act(() => result.current.removeExisting());
        expect(result.current.existingAudio).toBeNull();
    });

    it('removes the stored recording', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceAndText));
        act(() => result.current.removeExisting());
        expect(result.current.canSave).toBe(true);

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hello', removeAudio: true });
    });

    it('sends only the new recording when the stored one was removed and replaced', async () => {
        const { result, rerender } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceOnly));
        act(() => result.current.removeExisting());
        recorded();
        rerender();

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: '', audio: recorderState.recording!.blob });
    });

    it('lets a voice wish lose its text', async () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceAndText));
        act(() => result.current.changeDraft(''));
        expect(result.current.canSave).toBe(true);

        await act(() => result.current.save());

        expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: '' });
    });

    it('will not save a wish with neither text nor a recording', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceOnly));
        expect(result.current.draft).toBe('');
        act(() => result.current.removeExisting());
        expect(result.current.canSave).toBe(false);
    });

    it('cannot save while recording', () => {
        const { result, rerender } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.changeDraft('Changed'));
        recorderState.status = 'recording';
        rerender();
        expect(result.current.canSave).toBe(false);
    });

    it('opening another wish clears the recording and the removal', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(voiceAndText));
        act(() => result.current.removeExisting());
        act(() => result.current.open(voiceAndText));

        expect(result.current.existingAudio).toEqual(voiceAndText.audio);
        expect(recorderState.discard).toHaveBeenCalled();
    });

    it('frees the recorder when the sheet closes', () => {
        const { result } = renderHook(() => useWishEditor('e1'));
        act(() => result.current.open(entry));
        act(() => result.current.close());
        expect(recorderState.discard).toHaveBeenCalled();
    });
});
