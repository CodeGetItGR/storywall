'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { MediaBatchUploadResponseDto } from '@/lib/api/types';
import { formatBytes } from '@/lib/format';
import type { GalleryPickNotice, GalleryUploadLimits } from '@/lib/galleryUpload';

// The gallery page's upload lines, shared with the feed's Gallery block so both say the same.
export function useGalleryUploadNotices({ maxFiles, maxImageBytes, maxVideoBytes }: GalleryUploadLimits) {
    const t = useTranslations('GalleryPage');
    const toErrorMessage = useApiErrorMessage();

    const picked = useCallback(
        (notice: GalleryPickNotice): string | null => {
            if (notice === 'tooLarge') return t('filesTooLarge', { imageSize: formatBytes(maxImageBytes), videoSize: formatBytes(maxVideoBytes) });
            if (notice === 'limited') return t('selectionLimited', { count: maxFiles });
            return null;
        },
        [maxFiles, maxImageBytes, maxVideoBytes, t],
    );

    const uploaded = useCallback(
        (result: MediaBatchUploadResponseDto): string =>
            result.failed.length > 0
                ? result.failed
                      .map((failure) => {
                          const errorKey = `uploadErrors.${failure.errorCode}`;
                          return t.has(errorKey)
                              ? t(errorKey, { count: maxFiles, filename: failure.filename })
                              : t('uploadFailedItem', { filename: failure.filename });
                      })
                      .join(' ')
                : t('uploadComplete', { count: result.created.length, failed: 0 }),
        [maxFiles, t],
    );

    const failed = useCallback((error: unknown): string => toErrorMessage(error, t('uploadFailed')), [t, toErrorMessage]);

    // While the upload waits on a busy server, or crawls on a slow connection.
    const busy = t('uploadBusy');
    const slow = t('uploadSlow');

    return useMemo(() => ({ picked, uploaded, failed, busy, slow }), [busy, failed, picked, slow, uploaded]);
}
