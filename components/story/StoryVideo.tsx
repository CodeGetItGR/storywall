'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactEventHandler, type SyntheticEvent, useState } from 'react';

import { cn } from '@/lib/utils';

interface StoryVideoProps {
    src: string;
    className?: string;
    loop?: boolean;
    /** Show the mute/unmute toggle. Disable for silent contexts like the composer's own preview. */
    muteToggle?: boolean;
    onTimeUpdate?: ReactEventHandler<HTMLVideoElement>;
    onEnded?: ReactEventHandler<HTMLVideoElement>;
}

function preventContextMenu(event: SyntheticEvent<HTMLVideoElement>) {
    event.preventDefault();
}

export function StoryVideo({ src, className, loop = false, muteToggle = true, onTimeUpdate, onEnded }: StoryVideoProps) {
    const t = useTranslations('StoryPage');
    // Mobile browsers block autoplay of unmuted video, so playback always
    // starts muted; the viewer can opt into sound via the toggle below.
    const [isMuted, setIsMuted] = useState(true);
    // TEMP DEBUG — remove once mobile playback issue is diagnosed.
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    function handleToggleMute() {
        setIsMuted((v) => !v);
    }

    function handleVideoError(event: SyntheticEvent<HTMLVideoElement>) {
        const el = event.currentTarget;
        const err = el.error;
        setDebugInfo(`video error: code=${err?.code} message=${err?.message || '(none)'} src=${el.currentSrc}`);
    }

    function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
        const el = event.currentTarget;
        el.play().catch((err: unknown) => {
            const e = err as { name?: string; message?: string };
            setDebugInfo(`play() rejected: ${e?.name}: ${e?.message}`);
        });
    }

    return (
        <>
            {debugInfo && (
                <div className="absolute inset-x-0 top-0 z-50 break-words bg-red-600/90 p-2 text-xs text-white">{debugInfo}</div>
            )}
            <video
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
                onError={handleVideoError}
                onLoadedMetadata={handleLoadedMetadata}
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
