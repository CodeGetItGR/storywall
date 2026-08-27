'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Module previews are replicas of the real module screens: the same markup, class names and
 * tokens as the live components, fed with sample data. They are authored once at a real mobile
 * width and scaled down, so a preview always reads as the actual product rather than a mock.
 *
 * The card variant crops to a fixed frame — a deliberate slice of a screen that continues past
 * the edge. The detail variant sizes to its content so nothing is ever cut off.
 */
export const PREVIEW_BASE_WIDTH = 320;

export type ModulePreviewVariant = 'card' | 'detail';

const frameWidth: Record<ModulePreviewVariant, number> = {
    card: 224,
    detail: 288,
};

const CARD_FRAME_HEIGHT = 256;

export type ModulePreviewProps = {
    variant: ModulePreviewVariant;
};

export function ModulePreviewFrame({
    variant,
    children,
    className,
    surfaceClassName,
}: ModulePreviewProps & {
    children: ReactNode;
    className?: string;
    /** Backdrop behind the replica, matching the background the real screen renders on. */
    surfaceClassName?: string;
}) {
    const width = frameWidth[variant];
    const scale = width / PREVIEW_BASE_WIDTH;
    const surface = cn('shrink-0 overflow-hidden', surfaceClassName ?? 'bg-background', className);

    // `zoom` scales layout as well as paint, so the frame takes the replica's own height.
    if (variant === 'detail') {
        return (
            <div aria-hidden="true" className={surface} style={{ width: PREVIEW_BASE_WIDTH, zoom: scale }}>
                {children}
            </div>
        );
    }

    return (
        <div aria-hidden="true" className={cn('relative', surface)} style={{ width, height: CARD_FRAME_HEIGHT }}>
            <div className="absolute top-0 left-0 origin-top-left" style={{ width: PREVIEW_BASE_WIDTH, transform: `scale(${scale})` }}>
                {children}
            </div>
        </div>
    );
}
