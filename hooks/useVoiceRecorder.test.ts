import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { MAX_RECORDING_MS } from '@/lib/wishbook/voice';

class FakeMediaRecorder {
    static isTypeSupported = vi.fn((type: string) => type === 'audio/mp4');
    static last: FakeMediaRecorder | null = null;
    // What the browser really records in; Safari can differ from what was asked for.
    static actualMimeType: string | null = null;
    state: 'inactive' | 'recording' = 'inactive';
    mimeType: string;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(
        public stream: MediaStream,
        options?: { mimeType?: string },
    ) {
        this.mimeType = FakeMediaRecorder.actualMimeType ?? options?.mimeType ?? '';
        FakeMediaRecorder.last = this;
    }
    start() {
        this.state = 'recording';
    }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['sound'], { type: this.mimeType }) });
        this.onstop?.();
    }
}

const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

beforeEach(() => {
    vi.useFakeTimers();
    FakeMediaRecorder.last = null;
    FakeMediaRecorder.actualMimeType = null;
    FakeMediaRecorder.isTypeSupported.mockImplementation((type: string) => type === 'audio/mp4');
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    URL.createObjectURL = vi.fn(() => 'blob:wish');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    stopTrack.mockReset();
});

describe('useVoiceRecorder', () => {
    it('records, stops and hands back the recording', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        expect(result.current.status).toBe('idle');

        await act(() => result.current.start());
        expect(result.current.status).toBe('recording');
        expect(FakeMediaRecorder.last?.mimeType).toBe('audio/mp4');

        act(() => vi.advanceTimersByTime(4_000));
        expect(result.current.elapsedMs).toBeGreaterThanOrEqual(4_000);

        act(() => result.current.stop());
        expect(result.current.status).toBe('recorded');
        expect(result.current.recording?.url).toBe('blob:wish');
        expect(result.current.recording?.blob.type).toBe('audio/mp4');
        expect(result.current.recording?.durationMs).toBeGreaterThanOrEqual(4_000);
        expect(stopTrack).toHaveBeenCalled();
    });

    it('asks for WebM Opus first', async () => {
        FakeMediaRecorder.isTypeSupported.mockImplementation(() => true);
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        expect(FakeMediaRecorder.last?.mimeType).toBe('audio/webm;codecs=opus');
    });

    it("types the recording with the recorder's actual format", async () => {
        // iOS Safari: nothing matched up front, and it records MP4 anyway.
        FakeMediaRecorder.isTypeSupported.mockImplementation(() => false);
        FakeMediaRecorder.actualMimeType = 'audio/mp4';
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        expect(result.current.recording?.blob.type).toBe('audio/mp4');
    });

    it('stops itself at one minute', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => vi.advanceTimersByTime(MAX_RECORDING_MS + 500));
        expect(result.current.status).toBe('recorded');
        expect(result.current.recording?.durationMs).toBeLessThanOrEqual(MAX_RECORDING_MS + 500);
        expect(stopTrack).toHaveBeenCalled();
    });

    it('says the microphone is blocked when permission is refused', async () => {
        vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        expect(result.current.status).toBe('denied');
    });

    it('hides itself when there is no microphone', async () => {
        vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotFoundError' }));
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        expect(result.current.status).toBe('unsupported');
    });

    it('is unsupported without MediaRecorder', () => {
        vi.stubGlobal('MediaRecorder', undefined);
        const { result } = renderHook(() => useVoiceRecorder());
        expect(result.current.status).toBe('unsupported');
    });

    it('discards the recording and frees its URL', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        act(() => result.current.discard());
        expect(result.current.status).toBe('idle');
        expect(result.current.recording).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wish');
    });

    it('records again from a finished recording', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        await act(() => result.current.start());
        expect(result.current.status).toBe('recording');
        expect(result.current.recording).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wish');
    });

    it('releases the microphone when unmounted mid-recording', async () => {
        const { result, unmount } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        unmount();
        expect(stopTrack).toHaveBeenCalled();
    });

    it('frees the recording URL when unmounted', async () => {
        const { result, unmount } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wish');
    });

    it('releases a microphone granted after unmount', async () => {
        let grant: (s: MediaStream) => void = () => {};
        vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValueOnce(new Promise<MediaStream>((resolve) => (grant = resolve)));
        const { result, unmount } = renderHook(() => useVoiceRecorder());
        let started: Promise<void> = Promise.resolve();
        act(() => {
            started = result.current.start();
        });
        unmount();
        await act(async () => {
            grant(stream);
            await started;
        });
        expect(stopTrack).toHaveBeenCalled();
        expect(FakeMediaRecorder.last).toBeNull();
    });
});
