'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactEventHandler, type SyntheticEvent, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface StoryVideoProps {
    src: string;
    className?: string;
    loop?: boolean;
    /** Show the mute/unmute toggle. Disable for silent contexts like the composer's own preview. */
    muteToggle?: boolean;
    onTimeUpdate?: ReactEventHandler<HTMLVideoElement>;
    onEnded?: ReactEventHandler<HTMLVideoElement>;
    onLoadedData?: ReactEventHandler<HTMLVideoElement>;
    /** Fires when the browser can't decode/load `src` at all (e.g. some Android
     * browsers can't play a locally-picked video's blob: URL). */
    onLoadError?: () => void;
    /** Holds playback where it stopped while true, and resumes from there when it turns false. */
    paused?: boolean;
}

function preventContextMenu(event: SyntheticEvent<HTMLVideoElement>) {
    event.preventDefault();
}

function ignorePlayRejection() {
    // Autoplay policy can refuse play(); the viewer can still tap the story on.
}

export function StoryVideo({
    src,
    className,
    loop = false,
    muteToggle = true,
    onTimeUpdate,
    onEnded,
    onLoadedData,
    onLoadError,
    paused = false,
}: StoryVideoProps) {
    const t = useTranslations('StoryPage');
    // Mobile browsers block autoplay of unmuted video, so playback always
    // starts muted; the viewer can opt into sound via the toggle below.
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const pausedByUsRef = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (paused) {
            video.pause();
            pausedByUsRef.current = true;
        } else if (pausedByUsRef.current) {
            pausedByUsRef.current = false;
            Promise.resolve(video.play()).catch(ignorePlayRejection);
        }
    }, [paused]);

    function handleToggleMute() {
        setIsMuted((v) => !v);
    }

    return (
        <>
            <video
                ref={videoRef}
                src={src}
                className={cn('absolute inset-0 h-full w-full object-contain', className)}
                autoPlay
                muted={!muteToggle || isMuted}
                loop={loop}
                playsInline
                preload="auto"
                controls={false}
                controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
                disablePictureInPicture
                onContextMenu={preventContextMenu}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
                onLoadedData={onLoadedData}
                onError={onLoadError}
            />
            {muteToggle && (
                <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? t('unmuteStory') : t('muteStory')}
                    className="absolute top-20 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white transition-colors hover:bg-black/50"
                >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
            )}
        </>
    );
}
