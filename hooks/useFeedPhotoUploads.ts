'use client';

import { useCallback, useMemo } from 'react';

import { usePhotoSlotUploads } from '@/hooks/usePhotoSlotUploads';
import type { PhotoUploadSlots } from '@/hooks/usePhotoUploads';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FeedLayoutImageDto } from '@/lib/api/types';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { UploadedImage } from '@/lib/invitation/editorUploads';

type FeedPhotoUploadsInput = {
    eventId: string;
    store: InvitationEditorStore;
    // Edit mode's media learns the new photo at once (useFeedUploadedMedia).
    remember: (image: Pick<UploadedImage, 'mediaId' | 'url'>) => void;
};

// Edit mode always has a signed-in host.
const canPick = () => true;

// The photo slots of the feed's Save my date sections: the people's photos and the galleries' photos, uploaded to the
// feed and held in the store until Save. A photo that didn't upload says why at its own place.
export function useFeedPhotoUploads({ eventId, store, remember }: FeedPhotoUploadsInput): PhotoUploadSlots {
    const send = useCallback((body: FormData) => api.postForm<FeedLayoutImageDto>(endpoints.events.feedLayoutImages(eventId), body), [eventId]);
    const addUploaded = useCallback((mediaId: string, url: string) => remember({ mediaId, url }), [remember]);
    const { uploads, upload, report, issue } = usePhotoSlotUploads({ store, send, addUploaded });
    return useMemo(() => ({ uploads, upload, canPick, report, issue }), [issue, report, upload, uploads]);
}
