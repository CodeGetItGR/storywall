'use client';

import type { ReactEventHandler, SyntheticEvent } from 'react';

import { cn } from '@/lib/utils';

interface StoryVideoProps {
    src: string;
    className?: string;
    muted?: boolean;
    loop?: boolean;
    onTimeUpdate?: ReactEventHandler<HTMLVideoElement>;
    onEnded?: ReactEventHandler<HTMLVideoElement>;
}

function preventContextMenu(event: SyntheticEvent<HTMLVideoElement>) {
    event.preventDefault();
}

export function StoryVideo({ src, className, muted = false, loop = false, onTimeUpdate, onEnded }: StoryVideoProps) {
    return (
        <video
            src={src}
            className={cn('absolute inset-0 h-full w-full object-contain', className)}
            autoPlay
            muted={muted}
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
    );
}
