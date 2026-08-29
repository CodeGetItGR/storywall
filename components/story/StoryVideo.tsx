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

    function handleToggleMute() {
        setIsMuted((v) => !v);
    }

    return (
        <>
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
