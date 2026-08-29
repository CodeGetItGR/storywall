'use client';

import { Play, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export function StoryPreviewVideo({ src }: { src: string }) {
    const t = useTranslations('StoryComposer');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [needsPlay, setNeedsPlay] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        function playVideo() {
            void video!.play().then(
                () => setNeedsPlay(false),
                () => setNeedsPlay(true)
            );
        }

        video.muted = true;
        video.defaultMuted = true;
        video.load();
        playVideo();
        video.addEventListener('loadeddata', playVideo);
        video.addEventListener('canplay', playVideo);
        return () => {
            video.removeEventListener('loadeddata', playVideo);
            video.removeEventListener('canplay', playVideo);
        };
    }, [src]);

    function handlePlay() {
        const video = videoRef.current;
        if (!video) return;
        void video.play().then(() => setNeedsPlay(false));
    }

    function handlePlaybackError() {
        setHasError(true);
    }

    return (
        <div className="relative h-full w-full">
            {/* Video surface */}
            <video
                ref={videoRef}
                src={src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                controls={false}
                controlsList="nodownload noplaybackrate nofullscreen"
                disablePictureInPicture
                onError={handlePlaybackError}
                className="h-full w-full object-contain"
            />

            {/* Playback recovery */}
            {needsPlay && !hasError && (
                <button
                    type="button"
                    onClick={handlePlay}
                    aria-label={t('playPreview')}
                    className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white"
                >
                    <Play className="h-6 w-6 fill-current" aria-hidden="true" />
                </button>
            )}
            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
                    <TriangleAlert className="h-7 w-7 text-white/70" aria-hidden="true" />
                    <p className="mt-3 max-w-xs text-sm">{t('previewUnavailable')}</p>
                </div>
            )}
        </div>
    );
}
