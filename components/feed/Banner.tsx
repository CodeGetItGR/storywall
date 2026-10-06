import type { ReactNode } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { BannerFallback } from '@/components/feed/BannerFallback';
import { BannerOverlay } from '@/components/feed/BannerOverlay';

export function Banner({
    image,
    illustrationUrl = null,
    onIllustrationError,
    title,
    actions,
    glowVisible,
    fallbackActionHref,
    fallbackActionLabel,
}: {
    image: string | null;
    // A theme's illustration. Takes the cover's place, and so also the "add cover photo" prompt's.
    illustrationUrl?: string | null;
    // The illustration's URL can 404 once an admin replaces the art; lets the page refetch the event.
    onIllustrationError?: () => void;
    title: string;
    actions?: ReactNode;
    glowVisible: boolean;
    fallbackActionHref?: string;
    fallbackActionLabel?: string;
}) {
    // Illustration mode: the art sits clean on the theme colour and the title goes below it in
    // dark ink. The cover-photo overlay (dark gradient, white title) would only muddy it.
    if (illustrationUrl) {
        return (
            <div className="relative w-full px-2">
                <div className="relative isolate overflow-hidden rounded-[1.5rem]">
                    <div className="relative aspect-16/11 w-full bg-event">
                        <ProtectedImage
                            src={illustrationUrl}
                            alt=""
                            fill
                            className="object-contain"
                            preload
                            sizes="(max-width: 1024px) 100vw, 800px"
                            onError={onIllustrationError}
                        />
                    </div>
                    <div className="absolute inset-y-0 right-0 z-20 flex flex-col justify-between p-3">
                        <div className="flex h-full flex-col items-end justify-between gap-2">{actions}</div>
                    </div>
                </div>
                <h1 className="event-heading px-5 pt-3 text-center alegreya-light text-2xl text-event-title">{title}</h1>
            </div>
        );
    }

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
