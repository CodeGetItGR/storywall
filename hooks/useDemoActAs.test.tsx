import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoActAs } from '@/hooks/useDemoActAs';
import type { EventMemberResponseDto } from '@/lib/api/types';

type MutateCallbacks = { onSuccess?: (data: unknown) => void; onError?: (error: unknown) => void };
type AvatarMutationState = { isPending: boolean; error: unknown; variables: unknown };

const mocks = vi.hoisted(() => ({
    members: [] as unknown[],
    storedId: null as string | null,
    createMutate: vi.fn(),
    uploadMutate: vi.fn(),
    resetSetAvatar: vi.fn(),
    clearMutate: vi.fn(),
    resetClearAvatar: vi.fn(),
    setAvatar: { isPending: false, error: null, variables: undefined } as AvatarMutationState,
    clearAvatar: { isPending: false, error: null, variables: undefined } as AvatarMutationState,
}));

vi.mock('@/hooks/useEventMembers', () => ({
    useEventMembers: () => ({ data: mocks.members }),
    useCreateEventMember: () => ({ mutate: mocks.createMutate, reset: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/hooks/useDemoPersonaAvatar', () => ({
    useSetDemoPersonaAvatar: () => ({ ...mocks.setAvatar, mutate: mocks.uploadMutate, reset: mocks.resetSetAvatar }),
    useClearDemoPersonaAvatar: () => ({ ...mocks.clearAvatar, mutate: mocks.clearMutate, reset: mocks.resetClearAvatar }),
}));

vi.mock('@/lib/demo/demoActAs', () => ({
    readStoredDemoActAs: () => mocks.storedId,
    storeDemoActAs: vi.fn(),
    setDemoActAsMember: vi.fn(),
}));

const EVENT_ID = 'event-1';

function guest(id: string): EventMemberResponseDto {
    return { id, eventId: EVENT_ID, displayName: id, userId: null, avatarUrl: null } as EventMemberResponseDto;
}

function photo(name = 'p.jpg') {
    return new File([new Uint8Array([1])], name, { type: 'image/jpeg' });
}

// The per-call callbacks the hook passed to the Nth mutate call.
function callbacksOf(mutate: ReturnType<typeof vi.fn>, call = 0) {
    return mutate.mock.calls[call][1] as MutateCallbacks;
}

function renderOpen() {
    const view = renderHook(() => useDemoActAs(EVENT_ID));
    act(() => view.result.current.openAddDialog());
    expect(view.result.current.addDialog.open).toBe(true);
    return view;
}

describe('useDemoActAs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.members = [];
        mocks.storedId = null;
        mocks.setAvatar = { isPending: false, error: null, variables: undefined };
        mocks.clearAvatar = { isPending: false, error: null, variables: undefined };
    });

    it('creates the guest, uploads its photo with the new id, then closes the dialog', () => {
        const { result } = renderOpen();
        const file = photo();

        act(() => result.current.submitGuest({ displayName: 'Maria', file }));
        expect(mocks.createMutate).toHaveBeenCalledTimes(1);
        expect(mocks.createMutate.mock.calls[0][0]).toMatchObject({ eventId: EVENT_ID, role: 'ATTENDEE', displayName: 'Maria' });

        act(() => callbacksOf(mocks.createMutate).onSuccess?.(guest('new')));
        expect(mocks.uploadMutate).toHaveBeenCalledWith({ memberId: 'new', file }, expect.anything());
        expect(result.current.addDialog.open).toBe(true);

        act(() => callbacksOf(mocks.uploadMutate).onSuccess?.(guest('new')));
        expect(result.current.addDialog.open).toBe(false);
    });

    it('after a failed upload, a resubmit retries only the photo for the same guest', () => {
        const { result } = renderOpen();

        act(() => result.current.submitGuest({ displayName: 'Maria', file: photo() }));
        act(() => callbacksOf(mocks.createMutate).onSuccess?.(guest('new')));
        act(() => callbacksOf(mocks.uploadMutate).onError?.(new Error('upload failed')));
        expect(result.current.photoPending).toBe(true);
        expect(result.current.addDialog.open).toBe(true);

        const retry = photo('retry.jpg');
        act(() => result.current.submitGuest({ displayName: '', file: retry }));
        expect(mocks.createMutate).toHaveBeenCalledTimes(1);
        expect(mocks.uploadMutate).toHaveBeenCalledTimes(2);
        expect(mocks.uploadMutate.mock.calls[1][0]).toEqual({ memberId: 'new', file: retry });

        act(() => callbacksOf(mocks.uploadMutate, 1).onSuccess?.(guest('new')));
        expect(result.current.photoPending).toBe(false);
        expect(result.current.addDialog.open).toBe(false);
    });

    it('without a photo, creates the guest and closes without uploading', () => {
        const { result } = renderOpen();

        act(() => result.current.submitGuest({ displayName: 'Maria', file: null }));
        act(() => callbacksOf(mocks.createMutate).onSuccess?.(guest('new')));

        expect(mocks.uploadMutate).not.toHaveBeenCalled();
        expect(result.current.addDialog.open).toBe(false);
    });

    it('reopening the dialog forgets a pending photo retry', () => {
        const { result } = renderOpen();
        act(() => result.current.submitGuest({ displayName: 'Maria', file: photo() }));
        act(() => callbacksOf(mocks.createMutate).onSuccess?.(guest('new')));
        act(() => callbacksOf(mocks.uploadMutate).onError?.(new Error('upload failed')));
        expect(result.current.photoPending).toBe(true);

        act(() => result.current.closeAddDialog());
        act(() => result.current.openAddDialog());

        expect(result.current.photoPending).toBe(false);
    });

    it('a dialog dismissed during the upload stays closed when the upload lands', () => {
        const { result, rerender } = renderOpen();
        act(() => result.current.submitGuest({ displayName: 'Maria', file: photo() }));
        act(() => callbacksOf(mocks.createMutate).onSuccess?.(guest('new')));
        mocks.setAvatar = { isPending: true, error: null, variables: { memberId: 'new' } };
        rerender();
        mocks.resetSetAvatar.mockClear();

        act(() => result.current.closeAddDialog());
        expect(result.current.addDialog.open).toBe(false);
        // A pending mutation isn't reset, or its outcome would never arrive.
        expect(mocks.resetSetAvatar).not.toHaveBeenCalled();

        act(() => callbacksOf(mocks.uploadMutate).onSuccess?.(guest('new')));
        expect(result.current.addDialog.open).toBe(false);
    });

    it("reports a guest's photo state only while that guest is selected", () => {
        mocks.members = [guest('a'), guest('b')];
        mocks.storedId = 'b';
        mocks.setAvatar = { isPending: true, error: new Error('refused'), variables: { memberId: 'a', file: photo() } };
        const { result } = renderHook(() => useDemoActAs(EVENT_ID));

        expect(result.current.selectedId).toBe('b');
        expect(result.current.photoError).toBeNull();
        expect(result.current.isSavingPhoto).toBe(false);

        act(() => result.current.handleSelectChange({ target: { value: 'a' } } as ChangeEvent<HTMLSelectElement>));

        expect(result.current.photoError).toEqual(new Error('refused'));
        expect(result.current.isSavingPhoto).toBe(true);
    });
});
