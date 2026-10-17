import { getImageProps } from 'next/image';
import { preload } from 'react-dom';

import type { EventDetailResponseDto } from '@/lib/api/types';

export const BANNER_IMAGE_SIZES = '(max-width: 1024px) 100vw, 800px';

// The theme's illustration takes the cover's place on the banner.
export function bannerImageSrc(event: Pick<EventDetailResponseDto, 'coverMedia' | 'theme'>): string | null {
    return event.theme?.illustrationUrl ?? event.coverMedia?.mediaUrl ?? null;
}

// Server only. The signed-in feed renders in the browser, so the banner's <img> exists only after
// hydration. A preload in the server HTML starts the download with the page instead. Same props as
// Banner's image, so the browser reuses this response.
export function preloadBannerImage(event: Pick<EventDetailResponseDto, 'coverMedia' | 'theme'>): void {
    const src = bannerImageSrc(event);
    if (!src) return;

    try {
        const { props } = getImageProps({ src, alt: '', fill: true, sizes: BANNER_IMAGE_SIZES });
        preload(props.src, { as: 'image', imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: 'high' });
    } catch {
        // Best-effort — the banner loads its image normally after hydration.
    }
}
