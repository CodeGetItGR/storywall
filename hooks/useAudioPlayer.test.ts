import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAudioPlayer } from '@/hooks/useAudioPlayer';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useAudioPlayer', () => {
    it('plays and pauses', async () => {
        const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
        const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
        const { result } = renderHook(() => useAudioPlayer('https://r2.test/a.m4a', 4200));
        const audio = document.createElement('audio');
        act(() => result.current.audioRef(audio));

        await act(() => result.current.toggle());
        expect(play).toHaveBeenCalled();
        act(() => result.current.onPlay());
        expect(result.current.isPlaying).toBe(true);

        await act(() => result.current.toggle());
        expect(pause).toHaveBeenCalled();
        act(() => result.current.onPause());
        expect(result.current.isPlaying).toBe(false);
    });

    it('shows the given duration over the element', () => {
        const { result } = renderHook(() => useAudioPlayer('blob:x', 4200));
        const audio = document.createElement('audio');
        Object.defineProperty(audio, 'duration', { value: 0.1 });
        act(() => result.current.audioRef(audio));
        act(() => result.current.onLoadedMetadata());
        expect(result.current.durationMs).toBe(4200);
    });

    it('shows the given duration when the element reports Infinity', () => {
        const { result } = renderHook(() => useAudioPlayer('blob:x', 4200));
        const audio = document.createElement('audio');
        Object.defineProperty(audio, 'duration', { value: Number.POSITIVE_INFINITY });
        act(() => result.current.audioRef(audio));
        act(() => result.current.onLoadedMetadata());
        expect(result.current.durationMs).toBe(4200);
    });

    it("falls back to the element's duration when none is given", () => {
        const { result } = renderHook(() => useAudioPlayer('blob:x', 0));
        const audio = document.createElement('audio');
        Object.defineProperty(audio, 'duration', { value: 5 });
        act(() => result.current.audioRef(audio));
        act(() => result.current.onLoadedMetadata());
        expect(result.current.durationMs).toBe(5000);
    });

    it('follows the position and goes back to the start when it ends', () => {
        const { result } = renderHook(() => useAudioPlayer('a', 4200));
        const audio = document.createElement('audio');
        Object.defineProperty(audio, 'currentTime', { value: 2, writable: true });
        act(() => result.current.audioRef(audio));
        act(() => result.current.onTimeUpdate());
        expect(result.current.positionMs).toBe(2000);
        act(() => result.current.onEnded());
        expect(result.current.positionMs).toBe(0);
        expect(result.current.isPlaying).toBe(false);
    });

    it('marks a failed load and clears it for a new src', () => {
        const { result, rerender } = renderHook(({ src }) => useAudioPlayer(src, 4200), { initialProps: { src: 'a' } });
        act(() => result.current.onError());
        expect(result.current.failed).toBe(true);
        rerender({ src: 'b' });
        expect(result.current.failed).toBe(false);
    });

    it('a refused play() counts as a failure', async () => {
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotSupportedError'));
        const { result } = renderHook(() => useAudioPlayer('a', 1000));
        act(() => result.current.audioRef(document.createElement('audio')));
        await act(() => result.current.toggle());
        expect(result.current.failed).toBe(true);
    });
});
