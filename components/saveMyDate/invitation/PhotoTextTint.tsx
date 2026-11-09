'use client';

import { useRef } from 'react';

import { usePhotoTextTint, useShownPhoto } from '@/hooks/usePhotoTextTint';
import { tintBackground } from '@/lib/invitation/photoContrast';
import type { SectionPhotos } from '@/lib/invitation/render';

type PhotoTextTintProps = { photos: SectionPhotos; textColor: string };

// A soft layer between a section's photo and its text, once the photo the
// invitation shows is measured. `.smd-photo-tint-text-light` turns text with
// no colour of its own white. While the photo is measured the layer is marked,
// so the visual check knows to wait for it.
export function PhotoTextTint({ photos, textColor }: PhotoTextTintProps) {
    const ref = useRef<HTMLDivElement>(null);
    const tint = usePhotoTextTint(useShownPhoto(ref, photos), textColor);

    return (
        <div
            ref={ref}
            className={tint ? `smd-photo-tint smd-photo-tint-text-${tint.text}` : 'smd-photo-tint'}
            style={tint ? { background: tintBackground(tint) } : undefined}
            data-photo-tone={tint === undefined ? 'pending' : undefined}
            aria-hidden
        />
    );
}
