'use client';

import { useCallback } from 'react';

import { useGalleryCarousel } from '@/hooks/useGalleryCarousel';
import { galleryDotLabel, type GalleryImage } from '@/lib/invitation/gallery';
import type { InvitationLabels } from '@/lib/invitation/labels';

type GalleryCarouselProps = {
    images: GalleryImage[];
    labels: InvitationLabels;
    onOpen: (index: number) => void;
};

// One photo at a time, with side buttons and dots. The photo opens full screen.
export function GalleryCarousel({ images, labels, onOpen }: GalleryCarouselProps) {
    const carousel = useGalleryCarousel(images.length);
    const image = images[carousel.active];
    const openActive = useCallback(() => onOpen(carousel.active), [carousel.active, onOpen]);

    return (
        <>
            {/* Photo */}
            <div className="gallery-stage">
                <button type="button" className="gallery-open" onClick={openActive}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} />
                </button>
                <button type="button" aria-label={labels.previousPhoto} className="gallery-nav gallery-prev" onClick={carousel.previous}>
                    ‹
                </button>
                <button type="button" aria-label={labels.nextPhoto} className="gallery-nav gallery-next" onClick={carousel.next}>
                    ›
                </button>
            </div>

            {/* Dots */}
            <div className="gallery-dots">
                {images.map((item, index) => (
                    <GalleryDot
                        key={item.src + index}
                        index={index}
                        active={index === carousel.active}
                        label={galleryDotLabel(index + 1, labels)}
                        onSelect={carousel.goTo}
                    />
                ))}
            </div>
        </>
    );
}

type GalleryDotProps = {
    index: number;
    active: boolean;
    label: string;
    onSelect: (index: number) => void;
};

function GalleryDot({ index, active, label, onSelect }: GalleryDotProps) {
    const select = useCallback(() => onSelect(index), [index, onSelect]);

    return <button type="button" aria-label={label} aria-current={active} className={active ? 'gallery-dot active' : 'gallery-dot'} onClick={select} />;
}
