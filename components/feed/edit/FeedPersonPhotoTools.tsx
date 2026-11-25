'use client';

import { Camera, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { FeedPhotoIssue } from '@/components/feed/edit/FeedPhotoIssue';
import { PhotoToolButton } from '@/components/saveMyDate/editor/photos/PhotoToolButton';
import { usePhotoSlot } from '@/hooks/usePhotoSlot';
import { type PhotoFieldSlot, photoSlotKey } from '@/lib/invitation/photoSlots';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';

type FeedPersonPhotoToolsProps = {
    slot: PhotoFieldSlot;
    hasPhoto: boolean;
    onRemove: (slot: PhotoFieldSlot) => void;
    // The photo, or its empty place.
    children: ReactNode;
};

// A person's photo in edit mode: change and delete over its lower edge, and why a picked one didn't upload. An empty
// place has its own camera in the middle.
export function FeedPersonPhotoTools({ slot, hasPhoto, onRemove, children }: FeedPersonPhotoToolsProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { isAvailable, inputRef, pick, onFile, percent } = usePhotoSlot(slot);
    const remove = useCallback(() => onRemove(slot), [onRemove, slot]);
    if (!isAvailable) return children;

    return (
        <>
            {/* Photo, with change and delete over it */}
            <div className="relative">
                {children}
                {hasPhoto && percent === null && (
                    <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center gap-2">
                        <PhotoToolButton label={t('change')} onClick={pick}>
                            <Camera className="h-5 w-5" aria-hidden="true" />
                        </PhotoToolButton>
                        <PhotoToolButton label={t('gallery.delete')} onClick={remove}>
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </PhotoToolButton>
                        <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} hidden onChange={onFile} data-testid="person-photo-input" />
                    </div>
                )}
            </div>

            {/* Problem */}
            <FeedPhotoIssue photoKey={photoSlotKey(slot)} />
        </>
    );
}
