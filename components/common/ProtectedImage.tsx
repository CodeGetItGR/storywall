'use client';

import Image, { type ImageProps } from 'next/image';
import type { CSSProperties, MouseEvent } from 'react';

import { cn } from '@/lib/utils';

function preventImageContextMenu(event: MouseEvent<HTMLImageElement>) {
    event.preventDefault();
}

const protectedImageStyle: CSSProperties & { WebkitUserDrag: 'none' } = {
    WebkitTouchCallout: 'none',
    WebkitUserDrag: 'none',
};

// Staging runs on a metered image-optimization plan, so every image skips Next's optimizer there to avoid burning quota.
const skipRemoteOptimization = process.env.NEXT_PUBLIC_APP_ENV === 'staging';

export function ProtectedImage({ className, draggable, onContextMenu, style, unoptimized, ...props }: ImageProps) {
    const { alt, ...imageProps } = props;

    function handleContextMenu(event: MouseEvent<HTMLImageElement>) {
        preventImageContextMenu(event);
        onContextMenu?.(event);
    }

    return (
        <Image
            {...imageProps}
            alt={alt}
            unoptimized={unoptimized ?? skipRemoteOptimization}
            draggable={draggable ?? false}
            onContextMenu={handleContextMenu}
            className={cn('select-none', className)}
            style={{
                ...protectedImageStyle,
                ...style,
            }}
        />
    );
}
