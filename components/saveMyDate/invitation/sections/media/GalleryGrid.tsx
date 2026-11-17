'use client';

import { useCallback } from 'react';

import { type GalleryCellLayout, galleryGridClass, type GalleryImage, type GalleryShape } from '@/lib/invitation/gallery';

type GalleryGridProps = {
    images: GalleryImage[];
    layout: GalleryCellLayout;
    shape: GalleryShape;
    onOpen: (index: number) => void;
};

// The grid, masonry and featured layouts. A photo opens full screen.
export function GalleryGrid({ images, layout, shape, onOpen }: GalleryGridProps) {
    return (
        <div className={galleryGridClass(layout)}>
            {images.map((image, index) => (
                <GalleryCell key={image.src + index} image={image} index={index} shape={shape} onOpen={onOpen} />
            ))}
        </div>
    );
}

type GalleryCellProps = {
    image: GalleryImage;
    index: number;
    shape: GalleryShape;
    onOpen: (index: number) => void;
};

function GalleryCell({ image, index, shape, onOpen }: GalleryCellProps) {
    const open = useCallback(() => onOpen(index), [index, onOpen]);

    return (
        <div className={`wedart-gallery-cell shape-${shape}`}>
            <button type="button" className="gallery-open" onClick={open}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} />
            </button>
        </div>
    );
}
