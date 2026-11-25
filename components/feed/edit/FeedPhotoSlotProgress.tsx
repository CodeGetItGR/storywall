'use client';

import { useTranslations } from 'next-intl';

import { PhotoUploadProgress } from '@/components/saveMyDate/editor/photos/PhotoUploadProgress';
import { usePhotoSlot } from '@/hooks/usePhotoSlot';
import type { PhotoSlot } from '@/lib/invitation/photoSlots';

// The ring over a photo while the one replacing it uploads.
export function FeedPhotoSlotProgress({ slot }: { slot: PhotoSlot }) {
    const t = useTranslations('InvitationEditor.photos');
    const { percent } = usePhotoSlot(slot);
    return percent === null ? null : <PhotoUploadProgress percent={percent} label={t('uploading')} />;
}
