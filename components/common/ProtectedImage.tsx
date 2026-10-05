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

export function ProtectedImage({ className, draggable, onContextMenu, style, ...props }: ImageProps) {
    const { alt, ...imageProps } = props;

    function handleContextMenu(event: MouseEvent<HTMLImageElement>) {
        preventImageContextMenu(event);
        onContextMenu?.(event);
    }

    return (
        <Image
            {...imageProps}
            alt={alt}
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
