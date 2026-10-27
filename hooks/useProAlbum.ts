'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteMedia, useEventMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import { vendorKeys } from '@/hooks/useVendors';
import { useActiveMember } from '@/providers/EventProvider';

// The vendor's own Pro items: upload, list and delete. Every change refreshes vendors/me for the meter.
export function useProAlbum(eventId: string) {
    const t = useTranslations('Vendors');
    const toErrorMessage = useApiErrorMessage();
    const queryClient = useQueryClient();
    const activeMember = useActiveMember();
    const media = useEventMedia(eventId, 'PRO');
    const uploadBatch = useUploadMediaBatch();
    const deleteMedia = useDeleteMedia(eventId);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const items = useMemo(
        () => (media.data?.pages.flatMap((page) => page.content) ?? []).filter((item) => item.uploaderMemberId === activeMember?.id),
        [activeMember?.id, media.data?.pages],
    );

    const refreshMeter = useCallback(() => queryClient.invalidateQueries({ queryKey: vendorKeys.me(eventId) }), [eventId, queryClient]);

    const { fetchNextPage } = media;
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    const chooseFiles = useCallback((files: File[]) => {
        setNotice(null);
        setSelectedFiles(files);
    }, []);

    const upload = useCallback(async () => {
        if (selectedFiles.length === 0) return;
        setNotice(null);
        try {
            const result = await uploadBatch.mutateAsync({ eventId, files: selectedFiles, context: 'PRO' });
            setNotice(result.failed.length === 0 ? t('me.proUploaded') : t('me.proUploadFailed', { count: result.failed.length }));
            setSelectedFiles([]);
            void refreshMeter();
        } catch (uploadError) {
            setNotice(toErrorMessage(uploadError));
        }
    }, [eventId, refreshMeter, selectedFiles, t, toErrorMessage, uploadBatch]);

    const requestDelete = useCallback((mediaId: string) => setDeleteTargetId(mediaId), []);
    const cancelDelete = useCallback(() => setDeleteTargetId(null), []);
    const confirmDelete = useCallback(async () => {
        if (!deleteTargetId) return;
        try {
            await deleteMedia.mutateAsync(deleteTargetId);
            void refreshMeter();
        } catch (deleteError) {
            setNotice(toErrorMessage(deleteError));
        } finally {
            setDeleteTargetId(null);
        }
    }, [deleteMedia, deleteTargetId, refreshMeter, toErrorMessage]);

    return {
        items,
        isLoading: media.isLoading,
        hasNextPage: media.hasNextPage,
        loadMore,
        selectedFiles,
        notice,
        isUploading: uploadBatch.isPending,
        deleteTargetId,
        isDeleting: deleteMedia.isPending,
        chooseFiles,
        upload,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
}
