'use client';

import type { CSSProperties, TouchEvent as ReactTouchEvent } from 'react';
import { useEffect, useRef } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useImageZoomPan } from '@/hooks/useImageZoomPan';

export function PostMediaImageSlide({
    mediaUrl,
    alt,
    loading,
    active,
}: {
    mediaUrl: string;
    alt: string;
    loading: 'eager' | 'lazy';
    active: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const zoom = useImageZoomPan(containerRef);
    const { reset } = zoom;

    useEffect(() => {
        if (!active) reset();
    }, [active, reset]);

    function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
        const blocksCarousel = event.touches.length > 1 || zoom.isZoomed;
        zoom.handleTouchStart(event);
        if (blocksCarousel) event.stopPropagation();
    }

    function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
        if (event.touches.length < 2 && !zoom.isZoomed) return;
        event.preventDefault();
        event.stopPropagation();
        zoom.handleTouchMove(event);
    }

    function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
        const blocksCarousel = zoom.isZoomed || event.touches.length > 1;
        zoom.handleTouchEnd(event);
        if (blocksCarousel) event.stopPropagation();
    }

    function handleTouchCancel(event: ReactTouchEvent<HTMLDivElement>) {
        zoom.reset();
        event.stopPropagation();
    }

    return (
        <div
            ref={containerRef}
            className="h-full w-full touch-none overflow-hidden"
            onTouchStartCapture={handleTouchStart}
            onTouchMoveCapture={handleTouchMove}
            onTouchEndCapture={handleTouchEnd}
            onTouchCancelCapture={handleTouchCancel}
        >
            <div
                className="h-full w-full"
                style={
                    {
                        transform: `translate(${zoom.translate.x}px, ${zoom.translate.y}px) scale(${zoom.scale})`,
                        transition: zoom.isTransitionEnabled ? 'transform 200ms var(--motion-ease-standard)' : 'none',
                    } satisfies CSSProperties
                }
            >
                <ProtectedImage src={mediaUrl} alt={alt} fill className="object-contain" sizes="100vw" loading={loading} />
            </div>
        </div>
    );
}
