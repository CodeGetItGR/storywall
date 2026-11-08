'use client';

import { usePhotoTextTint } from '@/hooks/usePhotoTextTint';
import { tintBackground } from '@/lib/invitation/photoContrast';

type PhotoTextTintProps = { photos: string[]; textColor: string };

// A soft layer between a section's photo and its text, once the photo is
// measured. `.smd-photo-tint-text-light` turns the section's text white.
// While the photo is measured an empty layer marks the section, so the visual
// check knows to wait for it.
export function PhotoTextTint({ photos, textColor }: PhotoTextTintProps) {
    const tint = usePhotoTextTint(photos, textColor);
    if (tint === undefined) return <div className="smd-photo-tint" data-photo-tone="pending" aria-hidden />;
    if (tint === null) return null;

    return (
        <div
            className={`smd-photo-tint smd-photo-tint-text-${tint.text}`}
            style={{ background: tintBackground(tint) }}
            aria-hidden
        />
    );
}
