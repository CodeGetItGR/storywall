'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { EditorPanelSheet } from '@/components/saveMyDate/editor/EditorPanelSheet';
import { useEventPhotoPicker } from '@/hooks/useEventPhotoPicker';
import type { EventPhoto } from '@/lib/invitation/eventPhotos';

type EventPhotoPickerProps = {
    open: boolean;
    onClose: () => void;
    eventId: string | null;
    // The event photos the gallery holds now, in order.
    selectedIds: readonly string[];
    // How many photos the gallery takes in all.
    limit: number;
    // The gallery's other photos (the host's uploads), which count toward the limit too.
    taken: number;
    onChange: (mediaIds: string[]) => void;
};

// The event's photos, to add to the invitation's gallery. A tap adds or removes one at once.
export function EventPhotoPicker({ open, onClose, eventId, selectedIds, limit, taken, onChange }: EventPhotoPickerProps) {
    const t = useTranslations('InvitationEditor.eventPhotos');
    const { photos, isLoading, isEmpty, sentinel, toggle, isPicked, isFull } = useEventPhotoPicker({ eventId, selectedIds, limit, taken, onChange });

    return (
        <EditorPanelSheet open={open} title={t('title')} onClose={onClose}>
            {/* Empty */}
            {isEmpty && <p className="text-[13px] text-ink-muted">{t('empty')}</p>}

            {/* Loading */}
            {isLoading && (
                <div aria-busy="true" className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div key={index} className="aspect-square animate-pulse rounded-[10px] bg-ink/10" />
                    ))}
                </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                        <EventPhotoTile
                            key={photo.mediaId}
                            photo={photo}
                            alt={t('photoAlt', { n: index + 1 })}
                            picked={isPicked(photo.mediaId)}
                            disabled={!isPicked(photo.mediaId) && isFull}
                            onToggle={toggle}
                        />
                    ))}
                </div>
            )}

            {/* Next page */}
            <div ref={sentinel} aria-hidden="true" className="h-px" />
        </EditorPanelSheet>
    );
}

type EventPhotoTileProps = {
    photo: EventPhoto;
    alt: string;
    picked: boolean;
    disabled: boolean;
    onToggle: (mediaId: string) => void;
};

function EventPhotoTile({ photo, alt, picked, disabled, onToggle }: EventPhotoTileProps) {
    const toggle = useCallback(() => onToggle(photo.mediaId), [onToggle, photo.mediaId]);

    return (
        <button
            type="button"
            aria-pressed={picked}
            disabled={disabled}
            onClick={toggle}
            className="relative aspect-square overflow-hidden rounded-[10px] border-2 border-transparent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 aria-pressed:border-primary"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={alt} className="h-full w-full object-cover" />
            {picked && (
                <span aria-hidden="true" className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                    <Check className="h-4 w-4" />
                </span>
            )}
        </button>
    );
}
