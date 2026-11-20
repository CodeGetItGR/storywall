'use client';

import { type SyntheticEvent, useState } from 'react';

// Play/pause state for one <audio>. The given duration (the server's, or the recorder's clock) wins over the element's:
// a MediaRecorder WebM reports Infinity. The element's is only a fallback when none is given.
export function useAudioPlayer(src: string, durationMs: number) {
    // Held in state, not a ref, so the handlers below stay plain values the render can pass on.
    const [element, setElement] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [positionMs, setPositionMs] = useState(0);
    // Keyed to the src, like the failure: a new recording measures itself again.
    const [measured, setMeasured] = useState<{ src: string; ms: number } | null>(null);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    async function toggle() {
        if (!element) return;
        if (isPlaying) {
            element.pause();
            return;
        }
        try {
            await element.play();
        } catch {
            setFailedSrc(src);
        }
    }

    // The event's own element first: metadata can land before the element is in state.
    function onLoadedMetadata(event?: SyntheticEvent<HTMLAudioElement>) {
        const seconds = (event?.currentTarget ?? element)?.duration ?? Number.NaN;
        setMeasured(Number.isFinite(seconds) && seconds > 0 ? { src, ms: seconds * 1000 } : null);
    }

    return {
        audioRef: setElement,
        isPlaying,
        positionMs,
        durationMs: durationMs > 0 || measured?.src !== src ? durationMs : measured.ms,
        failed: failedSrc === src,
        toggle,
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
        onEnded: () => {
            setIsPlaying(false);
            setPositionMs(0);
        },
        onTimeUpdate: (event?: SyntheticEvent<HTMLAudioElement>) => setPositionMs(((event?.currentTarget ?? element)?.currentTime ?? 0) * 1000),
        onLoadedMetadata,
        onError: () => {
            setIsPlaying(false);
            setFailedSrc(src);
        },
    };
}

export type AudioPlayer = ReturnType<typeof useAudioPlayer>;
