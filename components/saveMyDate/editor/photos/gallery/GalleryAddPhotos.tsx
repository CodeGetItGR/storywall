'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import type { GalleryEditor } from '@/hooks/useGalleryEditor';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';

type GalleryAddPhotosProps = {
    gallery: GalleryEditor;
    // Another place to bring photos from, next to the upload button.
    extraSource?: ReactNode;
};

// Adds photos to the gallery from the device, several at once.
export function GalleryAddPhotos({ gallery, extraSource }: GalleryAddPhotosProps) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    const { pick, canAdd, inputRef, onFiles } = gallery;

    return (
        <div className="flex flex-wrap gap-2">
            {/* Upload */}
            <button type="button" onClick={pick} aria-disabled={!canAdd} className={`${SECONDARY_BUTTON_CLASS} flex-1`}>
                <Plus aria-hidden="true" />
                {t('add')}
            </button>
            <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={onFiles} data-testid="gallery-add-input" />

            {/* Other source */}
            {extraSource}
        </div>
    );
}
