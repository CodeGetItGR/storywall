'use client';

import { DndContext } from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';

import { GalleryPhotoTile, type GalleryTilePhoto } from '@/components/saveMyDate/editor/photos/gallery/GalleryPhotoTile';
import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';
import { useGalleryDrag } from '@/hooks/useGalleryDrag';
import type { GalleryEditor } from '@/hooks/useGalleryEditor';

type GalleryPhotoListProps = {
    photos: readonly GalleryTilePhoto[];
    gallery: GalleryEditor;
};

// The gallery's photos, three to a row, in their order on the invitation, then the ones still uploading.
export function GalleryPhotoList({ photos, gallery }: GalleryPhotoListProps) {
    const t = useTranslations('InvitationEditor.photos');
    const drag = useGalleryDrag(photos.length, gallery.reorder);
    if (photos.length === 0 && gallery.adding.length === 0) return null;

    return (
        <DndContext sensors={drag.sensors} accessibility={drag.accessibility} onDragEnd={drag.onDragEnd}>
            <SortableContext items={gallery.ids} strategy={rectSortingStrategy}>
                <ul className="grid grid-cols-3 gap-2">
                    {/* Photos */}
                    {photos.map((photo, index) => (
                        <GalleryPhotoTile
                            key={photo.id}
                            photo={photo}
                            index={index}
                            percent={gallery.replacing[index] ?? null}
                            canPick={gallery.canPick}
                            onReplace={gallery.replace}
                            onDelete={gallery.remove}
                        />
                    ))}

                    {/* Uploading */}
                    {gallery.adding.map((percent, index) => (
                        <li key={`adding-${index}`} className="relative aspect-square overflow-hidden rounded-[10px] bg-(--smd-editor-control)">
                            <PhotoUploadProgress percent={percent} label={t('uploading')} />
                        </li>
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
}
