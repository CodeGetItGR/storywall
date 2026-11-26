'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { type PinnedPhoto, shownPinnedPhotos } from '@/lib/feedPinned';
import type { MediaResolver } from '@/lib/invitation/render';

// onOpen: a tap opens the photo at that index full size (owner 2026-11-23). Left out in edit mode.
type FeedPinnedSectionProps = {
    photos: readonly PinnedPhoto[];
    media: MediaResolver;
    placeholder?: ReactNode;
    onOpen?: (index: number) => void;
};

// Pinned photos (KAN-261): a small row of the host's own photos, in the host's order. It scrolls sideways on a phone.
// With no photo to draw, the section draws nothing.
export function FeedPinnedSection({ photos, media, placeholder = null, onOpen }: FeedPinnedSectionProps) {
    const t = useTranslations('FeedSections.pinned');
    const shown = shownPinnedPhotos(photos, media);
    if (shown.length === 0) return placeholder;

    return (
        <ul className="flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3">
            {shown.map((photo, index) => (
                <li key={photo.id} className="shrink-0 snap-start">
                    <PinnedThumb url={photo.url} alt={t('photoAlt', { number: index + 1, count: shown.length })} index={index} onOpen={onOpen} />
                </li>
            ))}
        </ul>
    );
}

type PinnedThumbProps = { url: string; alt: string; index: number; onOpen?: (index: number) => void };

// On a phone the next photo shows at the edge; on a wide screen six fit in the feed's column.
function PinnedThumb({ url, alt, index, onOpen }: PinnedThumbProps) {
    const open = useCallback(() => onOpen?.(index), [index, onOpen]);
    const image = <ProtectedImage src={url} alt={alt} width={104} height={104} className="size-26 rounded-xl object-cover md:size-24" />;
    if (!onOpen) return image;

    return (
        <button type="button" onClick={open} aria-label={alt} className="block rounded-xl focus-ring">
            {image}
        </button>
    );
}
