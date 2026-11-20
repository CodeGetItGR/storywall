import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestWishForm } from '@/hooks/useGuestWishForm';
import type { VoiceRecorder } from '@/hooks/useVoiceRecorder';
import { ApiError } from '@/lib/api/client';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useQrWish', () => ({ useSendQrWish: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));

let recorderState: VoiceRecorder;
vi.mock('@/hooks/useVoiceRecorder', () => ({ useVoiceRecorder: () => recorderState }));

function fakeSubmitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}
function recorded() {
    recorderState.status = 'recorded';
    recorderState.recording = { blob: new Blob(['x'], { type: 'audio/webm' }), url: 'blob:x', durationMs: 3000 };
}

// Name filled and the box ticked; the message as given.
function filled(message: string) {
    const hook = renderHook(() => useGuestWishForm('t'));
    act(() => hook.result.current.changeGuestName({ target: { value: 'Maria' } } as React.ChangeEvent<HTMLInputElement>));
    act(() => hook.result.current.changeAccepted({ target: { checked: true } } as React.ChangeEvent<HTMLInputElement>));
    act(() => hook.result.current.changeMessage({ target: { value: message } } as React.ChangeEvent<HTMLTextAreaElement>));
    return hook;
}

beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({ id: 'w1', createdAt: '' });
    recorderState = { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn() };
});

describe('useGuestWishForm', () => {
    it('sends text only without a recording', async () => {
        const { result } = filled(' Hi ');

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hi', audio: null }));
    });

    it('can send a recording without text and frees the recorder', async () => {
        recorded();
        const { result } = filled('');
        expect(result.current.canSubmit).toBe(true);

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ message: '', audio: recorderState.recording!.blob }));
        expect(result.current.sent).toBe(true);
        expect(recorderState.discard).toHaveBeenCalled();
    });

    it('cannot send with nothing written or recorded', () => {
        const { result } = filled('   ');
        expect(result.current.canSubmit).toBe(false);
    });

    it('cannot send while recording', () => {
        recorderState.status = 'recording';
        const { result } = filled('Hi');
        expect(result.current.canSubmit).toBe(false);
    });

    it('the message is required only without a recording', () => {
        const { result, rerender } = filled('');
        expect(result.current.messageRequired).toBe(true);

        recorded();
        rerender();
        expect(result.current.messageRequired).toBe(false);
    });

    it('writing another wish clears the recording', () => {
        const { result } = filled('Hi');
        act(() => result.current.writeAnother());
        expect(recorderState.discard).toHaveBeenCalled();
    });

    it('keeps the recording and shows a recording error from the server', async () => {
        mutateAsync.mockRejectedValueOnce(new ApiError(400, { errorCode: 3130 }));
        recorded();
        const { result } = filled('');

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(result.current.submitError).toBe('error');
        expect(result.current.sent).toBe(false);
        expect(recorderState.discard).not.toHaveBeenCalled();
    });
});
