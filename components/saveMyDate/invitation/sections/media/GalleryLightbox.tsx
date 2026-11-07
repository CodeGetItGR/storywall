'use client';

import { Dialog } from '@base-ui/react/dialog';
import { useCallback } from 'react';

import { useLightboxSlides } from '@/hooks/useLightboxSlides';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import type { GalleryImage } from '@/lib/invitation/gallery';
import type { InvitationLabels } from '@/lib/invitation/labels';

type GalleryLightboxProps = {
    images: GalleryImage[];
    startIndex: number;
    labels: InvitationLabels;
    onClose: () => void;
};

// A gallery photo full screen. Swipe, arrow keys or the side buttons change
// photo; Esc, the phone's back button, the close button or a tap outside the
// photo close it.
export function GalleryLightbox({ images, startIndex, labels, onClose }: GalleryLightboxProps) {
    const { requestClose } = useOverlayHistory(true, onClose);
    const { viewportRef, index: current, previous, next, onKeyDown, onSlideClick } = useLightboxSlides(startIndex, images.length, requestClose);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) requestClose();
        },
        [requestClose],
    );

    return (
        <Dialog.Root open onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Popup aria-label={images[current]?.alt} className="smd-lightbox" onKeyDown={onKeyDown}>
                    {/* Photos */}
                    <div ref={viewportRef} className="smd-lightbox-viewport">
                        <div className="smd-lightbox-track">
                            {images.map((image, index) => (
                                <div key={image.src + index} className="smd-lightbox-slide" aria-hidden={index !== current} onClick={onSlideClick}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={image.src} alt={image.alt} loading={index === startIndex ? 'eager' : 'lazy'} draggable={false} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Close */}
                    <Dialog.Close aria-label={labels.close} className="smd-lightbox-close">
                        ✕
                    </Dialog.Close>

                    {/* Previous and next */}
                    {images.length > 1 && (
                        <>
                            <button type="button" aria-label={labels.previousPhoto} className="smd-lightbox-nav smd-lightbox-prev" onClick={previous}>
                                ‹
                            </button>
                            <button type="button" aria-label={labels.nextPhoto} className="smd-lightbox-nav smd-lightbox-next" onClick={next}>
                                ›
                            </button>
                        </>
                    )}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
