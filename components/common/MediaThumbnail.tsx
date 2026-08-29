'use client';

import { Play } from 'lucide-react';
import type { ImageProps } from 'next/image';
import type { MouseEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { MediaTypeConvention } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface MediaThumbnailProps extends Omit<ImageProps, 'src'> {
    src: string;
    mediaType: MediaTypeConvention;
}

function preventVideoContextMenu(event: MouseEvent<HTMLVideoElement>) {
    event.preventDefault();
}

/** Non-interactive preview tile for a grid/feed context — the wrapping element handles clicks, so video is muted with no controls and a play badge stands in for playback affordance. */
export function MediaThumbnail({ src, mediaType, className, fill, alt, ...imageProps }: MediaThumbnailProps) {
    if (mediaType !== 'VIDEO') {
        return <ProtectedImage src={src} alt={alt} fill={fill} className={className} {...imageProps} />;
    }

    return (
        <>
            <video
                src={src}
                muted
                playsInline
                preload="metadata"
                onContextMenu={preventVideoContextMenu}
                className={cn('pointer-events-none select-none', fill && 'absolute inset-0 h-full w-full', className)}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                    <Play className="h-4 w-4 fill-white" strokeWidth={0} />
                </span>
            </span>
        </>
    );
}
