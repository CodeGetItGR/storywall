'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { ImagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

import { FeedPinnedTile } from '@/components/feed/edit/FeedPinnedTile';
import { GALLERY_DRAG_MESSAGES, useSortableDrag } from '@/hooks/useSortableDrag';
import type { PinnedPhoto } from '@/lib/feedPinned';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';
import type { MediaResolver } from '@/lib/invitation/render';
import { FEED_PINNED_MAX_PHOTOS } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type FeedPinnedFieldProps = {
    photos: readonly PinnedPhoto[];
    media: MediaResolver;
    uploading: boolean;
    onAdd: (file: File) => void;
    onRemove: (photoId: string) => void;
    onMove: (activeId: string, overId: string) => void;
};

// Pinned photos in its settings sheet: the photos, dragged into order and taken out, then an Add photo tile while there
// is room.
export function FeedPinnedField({ photos, media, uploading, onAdd, onRemove, onMove }: FeedPinnedFieldProps) {
    const t = useTranslations('FeedEditor');
    const drag = useSortableDrag(photos.length, onMove, GALLERY_DRAG_MESSAGES);
    const pick = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onAdd(file);
        },
        [onAdd],
    );

    return (
        <DndContext sensors={drag.sensors} collisionDetection={closestCenter} accessibility={drag.accessibility} onDragEnd={drag.onDragEnd}>
            <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-3 gap-2">
                    {/* Photos */}
                    {photos.map((photo, index) => (
                        <FeedPinnedTile
                            key={photo.id}
                            id={photo.id}
                            src={media(photo.image.mediaId)}
                            number={index + 1}
                            count={photos.length}
                            onRemove={onRemove}
                        />
                    ))}

                    {/* Add photo */}
                    {photos.length < FEED_PINNED_MAX_PHOTOS && (
                        <li aria-busy={uploading}>
                            <label
                                title={t('addPhoto')}
                                className={cn(
                                    'grid aspect-square cursor-pointer place-items-center rounded-[10px] border border-dashed border-(--smd-editor-line) text-(--smd-editor-muted) transition-colors focus-within:ring-2 focus-within:ring-(--smd-editor-accent) hover:bg-white/10',
                                    uploading && 'pointer-events-none opacity-60',
                                )}
                            >
                                <ImagePlus className="h-6 w-6" aria-hidden="true" />
                                <input
                                    type="file"
                                    accept={PHOTO_ACCEPT}
                                    aria-label={t('addPhoto')}
                                    disabled={uploading}
                                    onChange={pick}
                                    className="sr-only"
                                />
                            </label>
                        </li>
                    )}
                </ul>
            </SortableContext>
        </DndContext>
    );
}
