import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { BannerFallback } from '@/components/feed/BannerFallback';
import { BannerOverlay } from '@/components/feed/BannerOverlay';

export function Banner({
    image,
    title,
    actions,
    glowVisible,
    fallbackActionHref,
    fallbackActionLabel,
}: {
    image: string | null;
    title: string;
    actions?: ReactNode;
    glowVisible: boolean;
    fallbackActionHref?: string;
    fallbackActionLabel?: string;
}) {
    return (
        <div className="relative w-full px-2">
            {/* Banner */}
            <div className="relative isolate overflow-hidden rounded-[1.5rem]">
                <div className="relative aspect-16/11 w-full">
                    {image ? (
                        <ProtectedImage src={image} alt={title} fill className="object-cover" preload sizes="(max-width: 1024px) 100vw, 800px" />
                    ) : (
                        <BannerFallback actionHref={fallbackActionHref} actionLabel={fallbackActionLabel} />
                    )}
                </div>
                <BannerOverlay title={title} actions={actions} glowVisible={glowVisible} />
            </div>
        </div>
    );
}
