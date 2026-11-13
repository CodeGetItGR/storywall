'use client';

import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';
import { useGalleryEditor } from '@/hooks/useGalleryEditor';
import type { InvitationEditorState } from '@/lib/invitation/editorStore';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';
import type { ImageRef } from '@/lib/invitation/primitives';

type GalleryEmptyToolProps = {
    sectionId: string;
    images: readonly ImageRef[];
    edit: InvitationEditorState['edit'];
};

// A gallery with no photos yet, on the canvas: a box to add the first ones. The rest
// of the gallery's photos are managed in its section settings.
export function GalleryEmptyTool({ sectionId, images, edit }: GalleryEmptyToolProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { isAvailable, adding, inputRef, pick, onFiles } = useGalleryEditor({ sectionId, images, edit });

    // The box sits inside the section: a tap must not select it too.
    const onPick = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            pick();
        },
        [pick],
    );

    if (!isAvailable) return null;
    const percent = adding[0];

    return (
        <div
            className="relative mx-auto my-4 aspect-[3/2] w-full max-w-md overflow-hidden rounded-xl border-2 border-dashed border-black/15 bg-[#f6f2ee]"
            data-smd-keep-text=""
        >
            {/* Add */}
            {percent === undefined && (
                <button
                    type="button"
                    onClick={onPick}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl font-sans text-sm text-[#8a8a8a] transition-colors hover:text-[#5f5a56] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    <Camera className="h-8 w-8" aria-hidden="true" />
                    <span>{t('gallery.add')}</span>
                </button>
            )}
            <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={onFiles} data-testid="gallery-add-input" />

            {/* Upload */}
            {percent !== undefined && <PhotoUploadProgress percent={percent} label={t('uploading')} />}
        </div>
    );
}
