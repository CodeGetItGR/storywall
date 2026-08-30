'use client';

import { Loader2, Play, VideoOff } from 'lucide-react';
import type { ImageProps } from 'next/image';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import type { MediaStatus, MediaTypeConvention } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface MediaThumbnailProps extends Omit<ImageProps, 'src'> {
    src: string;
    mediaType: MediaTypeConvention;
    status?: MediaStatus;
    thumbnailUrl?: string | null;
}

function preventVideoContextMenu(event: MouseEvent<HTMLVideoElement>) {
    event.preventDefault();
}

/** Non-interactive preview tile for a grid/feed context — the wrapping element handles clicks, so video is muted with no controls and a play badge stands in for playback affordance. */
export function MediaThumbnail({ src, mediaType, status = 'READY', thumbnailUrl, className, fill, alt, ...imageProps }: MediaThumbnailProps) {
    const t = useTranslations('MediaThumbnail');

    if (mediaType === 'VIDEO' && status === 'PROCESSING') {
        return (
            <span
                className={cn(
                    'flex flex-col items-center justify-center gap-2 bg-surface-muted text-xs font-semibold text-ink-muted',
                    fill && 'absolute inset-0 h-full w-full',
                    className
                )}
            >
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>{t('processing')}</span>
            </span>
        );
    }

    if (mediaType === 'VIDEO' && status === 'FAILED') {
        return (
            <span
                className={cn(
                    'flex flex-col items-center justify-center gap-2 bg-surface-muted px-3 text-center text-xs font-semibold text-ink-muted',
                    fill && 'absolute inset-0 h-full w-full',
                    className
                )}
            >
                <VideoOff className="h-5 w-5 text-ink-faint" aria-hidden="true" />
                <span>{t('failed')}</span>
            </span>
        );
    }

    if (mediaType !== 'VIDEO') {
        return <ProtectedImage src={src} alt={alt} fill={fill} className={className} {...imageProps} />;
    }

    if (thumbnailUrl) {
        return (
            <>
                <ProtectedImage src={thumbnailUrl} alt={alt} fill={fill} className={className} {...imageProps} />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white">
                        <Play className="h-4 w-4 fill-white" strokeWidth={0} />
                    </span>
                </span>
            </>
        );
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
