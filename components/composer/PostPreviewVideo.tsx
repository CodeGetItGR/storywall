'use client';

import { Play } from 'lucide-react';
import { useRef, useState } from 'react';

interface PostPreviewVideoProps {
    src: string;
    ariaLabel: string;
    playLabel: string;
    pauseLabel: string;
}

export function PostPreviewVideo({ src, ariaLabel, playLabel, pauseLabel }: PostPreviewVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPaused, setIsPaused] = useState(true);

    function togglePlayback() {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            void video.play().catch(() => setIsPaused(true));
        } else {
            video.pause();
        }
    }

    function handlePause() {
        setIsPaused(true);
    }

    function handlePlay() {
        setIsPaused(false);
    }

    return (
        <button
            type="button"
            onClick={togglePlayback}
            aria-label={isPaused ? playLabel : pauseLabel}
            className="relative h-full w-full cursor-pointer"
        >
            <video
                ref={videoRef}
                src={src}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onPause={handlePause}
                onPlay={handlePlay}
                className="h-full w-full object-contain"
                aria-label={ariaLabel}
            />
            {isPaused && (
                <span className="pointer-events-none absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white">
                    <Play className="h-5 w-5 fill-white" strokeWidth={0} />
                </span>
            )}
        </button>
    );
}
