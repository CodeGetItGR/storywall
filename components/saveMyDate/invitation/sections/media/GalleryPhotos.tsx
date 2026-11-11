'use client';

import { GalleryCarousel } from '@/components/saveMyDate/invitation/sections/media/GalleryCarousel';
import { GalleryGrid } from '@/components/saveMyDate/invitation/sections/media/GalleryGrid';
import { GalleryLightbox } from '@/components/saveMyDate/invitation/sections/media/GalleryLightbox';
import { useGalleryLightbox } from '@/hooks/useGalleryLightbox';
import type { GalleryImage, GalleryLayout, GalleryShape } from '@/lib/invitation/gallery';
import type { InvitationLabels } from '@/lib/invitation/labels';

type GalleryPhotosProps = {
    images: GalleryImage[];
    layout: GalleryLayout;
    shape: GalleryShape;
    labels: InvitationLabels;
};

// The photos in the host's chosen layout, and the full-screen view they open.
export function GalleryPhotos({ images, layout, shape, labels }: GalleryPhotosProps) {
    const lightbox = useGalleryLightbox();

    return (
        <>
            {/* Photos */}
            {layout === 'carousel' ? (
                <GalleryCarousel images={images} labels={labels} onOpen={lightbox.open} />
            ) : (
                <GalleryGrid images={images} layout={layout} shape={shape} onOpen={lightbox.open} />
            )}

            {/* Full screen */}
            {lightbox.openIndex !== null && <GalleryLightbox images={images} startIndex={lightbox.openIndex} labels={labels} onClose={lightbox.close} />}
        </>
    );
}
