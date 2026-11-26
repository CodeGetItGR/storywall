'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useGalleryUploadNotices } from '@/hooks/useGalleryUploadNotices';
import { useUploadMediaBatch } from '@/hooks/useMedia';
import { useSlowUpload } from '@/hooks/useSlowUpload';
import { useUploadFrame } from '@/hooks/useUploadFrame';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { pickGalleryFiles } from '@/lib/galleryUpload';
import { getUploadLimits } from '@/lib/uploadLimits';

// The feed Gallery block's button: the picked photos and videos upload at once to the event's gallery, with the
// gallery page's limits and lines.
export function useFeedGalleryUpload(event: EventDetailResponseDto) {
    const eventId = event.id;
    const { data: appConfig } = useAppConfig();
    const { filesPerRequest: maxFiles, imageBytes: maxImageBytes, videoBytes: maxVideoBytes } = getUploadLimits(appConfig?.media);
    const limits = useMemo(() => ({ maxFiles, maxImageBytes, maxVideoBytes }), [maxFiles, maxImageBytes, maxVideoBytes]);
    const notices = useGalleryUploadNotices(limits);
    const upload = useUploadMediaBatch();
    const slow = useSlowUpload(upload.isPending);
    const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const frame = useUploadFrame({
        eventId,
        frame: event.uploadFrame,
        title: event.title,
        startAt: event.schedule.startAt,
        timezone: event.schedule.timezone,
    });
    // Framing runs before the upload starts, so the button shows it is busy from the pick.
    const [framing, setFraming] = useState(false);

    const onFiles = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const picked = pickGalleryFiles(Array.from(event.target.files ?? []), limits);
            event.target.value = '';
            setNotice(notices.picked(picked.notice));
            if (picked.files.length === 0) return;
            let prepared: { files: File[]; notice: string | null } = { files: picked.files, notice: null };
            setFraming(true);
            try {
                prepared = await frame.prepare(picked.files);
            } finally {
                setFraming(false);
            }
            try {
                const result = await upload.mutateAsync({ eventId, files: prepared.files, onBusy: setBusy });
                // A pick that left files out keeps saying so after the upload.
                setNotice([notices.picked(picked.notice), prepared.notice, notices.uploaded(result)].filter(Boolean).join(' '));
            } catch (error) {
                setNotice(notices.failed(error));
            }
        },
        [eventId, frame, limits, notices, upload],
    );

    return {
        onFiles,
        uploading: upload.isPending || framing,
        notice: busy ? notices.busy : slow ? notices.slow : notice,
        frame: frame.control,
    };
}
