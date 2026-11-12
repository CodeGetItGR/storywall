'use client';

import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';
import { usePhotoSlot } from '@/hooks/usePhotoSlot';
import type { PhotoSlot } from '@/lib/invitation/photoSlots';
import { PHOTO_ACCEPT } from '@/lib/invitation/photoUpload';

type PhotoSlotToolProps = {
    slot: PhotoSlot;
    // With a photo the camera is a small button at the bottom; without one it sits in the middle with a label.
    hasPhoto: boolean;
};

// The camera on one photo slot of the canvas (old wedartCameraIcon): adds or
// replaces the photo, and shows the upload while it runs.
export function PhotoSlotTool({ slot, hasPhoto }: PhotoSlotToolProps) {
    const t = useTranslations('InvitationEditor.photos');
    const { isAvailable, inputRef, pick, onFile, percent } = usePhotoSlot(slot);
    if (!isAvailable) return null;

    const label = hasPhoto ? t('change') : t('upload');

    return (
        <>
            {/* Camera */}
            {percent !== null ? null : hasPhoto ? (
                <button
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={pick}
                    className="smd-photo-camera absolute bottom-3 left-1/2 z-10 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-black/55 text-white shadow-md transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                </button>
            ) : (
                <button
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={pick}
                    className="smd-photo-camera absolute top-1/2 left-1/2 z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-xl p-3 text-sm text-[#8a8a8a] transition-colors hover:text-[#5f5a56] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    <Camera className="h-8 w-8" aria-hidden="true" />
                    <span>{t('empty')}</span>
                </button>
            )}
            <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} hidden onChange={onFile} data-testid="photo-slot-input" />

            {/* Upload */}
            {percent !== null && <PhotoUploadProgress percent={percent} label={t('uploading')} />}
        </>
    );
}
