'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useGalleryUploadNotices } from '@/hooks/useGalleryUploadNotices';
import { useUploadMediaBatch } from '@/hooks/useMedia';
import { useSlowUpload } from '@/hooks/useSlowUpload';
import { pickGalleryFiles } from '@/lib/galleryUpload';
import { getUploadLimits } from '@/lib/uploadLimits';

// The feed Gallery block's button: the picked photos and videos upload at once to the event's gallery, with the
// gallery page's limits and lines.
export function useFeedGalleryUpload(eventId: string) {
    const { data: appConfig } = useAppConfig();
    const { filesPerRequest: maxFiles, imageBytes: maxImageBytes, videoBytes: maxVideoBytes } = getUploadLimits(appConfig?.media);
    const limits = useMemo(() => ({ maxFiles, maxImageBytes, maxVideoBytes }), [maxFiles, maxImageBytes, maxVideoBytes]);
    const notices = useGalleryUploadNotices(limits);
    const upload = useUploadMediaBatch();
    const slow = useSlowUpload(upload.isPending);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const onFiles = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const picked = pickGalleryFiles(Array.from(event.target.files ?? []), limits);
            event.target.value = '';
            setNotice(notices.picked(picked.notice));
            if (picked.files.length === 0) return;
            try {
                const result = await upload.mutateAsync({ eventId, files: picked.files, onBusy: setBusy });
                // A pick that left files out keeps saying so after the upload.
                setNotice([notices.picked(picked.notice), notices.uploaded(result)].filter(Boolean).join(' '));
            } catch (error) {
                setNotice(notices.failed(error));
            }
        },
        [eventId, limits, notices, upload],
    );

    return {
        onFiles,
        uploading: upload.isPending,
        notice: busy ? notices.busy : slow ? notices.slow : notice,
    };
}
