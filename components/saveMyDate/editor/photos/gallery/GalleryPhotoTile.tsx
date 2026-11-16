'use client';

import { Camera, GripVertical, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';
import { useGalleryPhotoTile } from '@/hooks/useGalleryPhotoTile';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';
import { cn } from '@/lib/utils';

export type GalleryTilePhoto = { id: string; src?: string; alt: string };

type GalleryPhotoTileProps = {
    photo: GalleryTilePhoto;
    index: number;
    // How far its replacement has come, while one uploads.
    percent: number | null;
    canPick?: () => boolean;
    onReplace: (index: number, file: File) => void;
    onDelete: (index: number) => void;
};

const TILE_BUTTON =
    'absolute grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white shadow-sm hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none [&_svg]:h-4 [&_svg]:w-4';

// One photo of the gallery list: a handle to drag it, and buttons to change or delete it.
export function GalleryPhotoTile({ photo, index, percent, canPick, onReplace, onDelete }: GalleryPhotoTileProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { setNodeRef, handleRef, handleProps, style, isDragging, inputRef, pick, onFile, remove } = useGalleryPhotoTile({
        id: photo.id,
        index,
        canPick,
        onReplace,
        onDelete,
    });

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={cn(
                'relative aspect-square overflow-hidden rounded-[10px] bg-(--smd-editor-control)',
                isDragging && 'z-10 opacity-80 shadow-lg',
            )}
        >
            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo.src && <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />}

            {/* Actions */}
            <button
                type="button"
                aria-label={t('gallery.reorder')}
                title={t('gallery.reorder')}
                className={cn(TILE_BUTTON, 'top-1 left-1 cursor-grab touch-none')}
                ref={handleRef}
                {...handleProps}
            >
                <GripVertical aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label={t('gallery.delete')}
                title={t('gallery.delete')}
                onClick={remove}
                className={cn(TILE_BUTTON, 'top-1 right-1')}
            >
                <Trash2 aria-hidden="true" />
            </button>
            <button type="button" aria-label={t('change')} title={t('change')} onClick={pick} className={cn(TILE_BUTTON, 'right-1 bottom-1')}>
                <Camera aria-hidden="true" />
            </button>
            <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} hidden onChange={onFile} data-testid="gallery-replace-input" />

            {/* Upload */}
            {percent !== null && <PhotoUploadProgress percent={percent} label={t('uploading')} />}
        </li>
    );
}
