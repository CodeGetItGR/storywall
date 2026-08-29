import Image from 'next/image';
import type { ReactNode } from 'react';

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
                        <Image src={image} alt={title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 800px" />
                    ) : (
                        <BannerFallback actionHref={fallbackActionHref} actionLabel={fallbackActionLabel} />
                    )}
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-1/2 bg-white/10 [clip-path:polygon(24%_0,100%_0,100%_100%,0_100%)]"
                        aria-hidden="true"
                    />
                </div>
                <BannerOverlay title={title} actions={actions} glowVisible={glowVisible} />
            </div>
        </div>
    );
}
