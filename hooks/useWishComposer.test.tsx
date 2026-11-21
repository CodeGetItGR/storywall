import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useWishComposer } from '@/hooks/useWishComposer';

const mutateAsync = vi.fn();
let isPending = false;
vi.mock('@/hooks/useWishbook', () => ({
    useCreateWishbookEntry: () => ({ mutateAsync, isPending, error: null }),
}));

let recorderState: VoiceRecorder;
vi.mock('@/hooks/useVoiceRecorder', () => ({ useVoiceRecorder: () => recorderState }));

const options = { eventId: 'e1', guestName: 'Maria', maxMessageLength: 2000 };

function fakeSubmitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}
function typed(value: string) {
    return { target: { value } } as React.ChangeEvent<HTMLTextAreaElement>;
}
function recorded() {
    recorderState.status = 'recorded';
    recorderState.recording = { blob: new Blob(['x'], { type: 'audio/webm' }), url: 'blob:x', durationMs: 3000 };
}

beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    isPending = false;
    recorderState = { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn() };
});
afterEach(() => {
    vi.useRealTimers();
});

describe('useWishComposer', () => {
    it('sends text only as before', async () => {
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed(' Hi ')));

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(mutateAsync).toHaveBeenCalledWith({ message: 'Hi', guestName: 'Maria', audio: null });
        expect(result.current.message).toBe('');
        expect(result.current.showSent).toBe(true);
    });

    it('cuts the message at the limit', () => {
        const { result } = renderHook(() => useWishComposer({ ...options, maxMessageLength: 5 }));
        act(() => result.current.changeMessage(typed('Hello there')));
        expect(result.current.message).toBe('Hello');
    });

    it('sends a recording without text and frees the recorder', async () => {
        recorded();
        const { result } = renderHook(() => useWishComposer(options));
        expect(result.current.canSend).toBe(true);

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(mutateAsync).toHaveBeenCalledWith({ message: '', guestName: 'Maria', audio: recorderState.recording!.blob });
        expect(recorderState.discard).toHaveBeenCalled();
        expect(result.current.showSent).toBe(true);
    });

    it('cannot send with nothing written or recorded', async () => {
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed('   ')));
        expect(result.current.canSend).toBe(false);

        await act(() => result.current.submit(fakeSubmitEvent()));
        expect(mutateAsync).not.toHaveBeenCalled();
    });

    it('cannot send while recording', () => {
        recorderState.status = 'recording';
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed('Hi')));
        expect(result.current.canSend).toBe(false);
    });

    it('cannot send while a wish is on its way', () => {
        isPending = true;
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed('Hi')));
        expect(result.current.canSend).toBe(false);
        expect(result.current.isSending).toBe(true);
    });

    it('keeps the text and the recording when sending fails', async () => {
        mutateAsync.mockRejectedValueOnce(new Error('3131'));
        recorded();
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed('Hi')));

        await act(() => result.current.submit(fakeSubmitEvent()));

        expect(recorderState.discard).not.toHaveBeenCalled();
        expect(result.current.message).toBe('Hi');
        expect(result.current.showSent).toBe(false);
    });

    it('hides the sent note after five seconds', async () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useWishComposer(options));
        act(() => result.current.changeMessage(typed('Hi')));

        await act(() => result.current.submit(fakeSubmitEvent()));
        expect(result.current.showSent).toBe(true);

        act(() => vi.advanceTimersByTime(5000));
        expect(result.current.showSent).toBe(false);
    });
});
