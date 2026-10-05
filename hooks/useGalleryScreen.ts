'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useContentAccess } from '@/hooks/useContentAccess';
import { useGallerySelection } from '@/hooks/useGallerySelection';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useDeleteMedia, useEventMedia, useOriginalMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { canReportContent } from '@/lib/contentPermissions';
import { downloadBlob } from '@/lib/download';
import { isEventDeleted, isEventWritable, readableModuleKeys } from '@/lib/eventLifecycle';
import { formatBytes } from '@/lib/format';
import { getUploadLimits } from '@/lib/uploadLimits';
import { useActiveMember } from '@/providers/EventProvider';
import { useMobileChromeActions } from '@/providers/MobileChromeProvider';

export function useGalleryScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const activeMember = useActiveMember();
    const contentAccess = useContentAccess();
    const t = useTranslations('GalleryPage');
    const toErrorMessage = useApiErrorMessage();
    const router = useRouter();
    const { hideMobileTabBar, showMobileTabBar } = useMobileChromeActions();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadNotice, setUploadNotice] = useState<string | null>(null);
    const [isUploadBusy, setIsUploadBusy] = useState(false);
    const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
    const [reportMediaId, setReportMediaId] = useState<string | null>(null);
    const [originalError, setOriginalError] = useState<string | null>(null);
    const [selectionDownloadError, setSelectionDownloadError] = useState<string | null>(null);
    const [isDownloadingSelection, setIsDownloadingSelection] = useState(false);
    const [archiveDownloadOpen, setArchiveDownloadOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const pendingAdvanceIndexRef = useRef<number | null>(null);

    const { data: mediaPages, isLoading: isLoadingMedia, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventMedia(eventId);
    const media = useMemo(() => mediaPages?.pages.flatMap((page) => page.content) ?? [], [mediaPages?.pages]);
    // Looked up from the list rather than held as a copy, so each refetch's fresh
    // presigned URLs reach the open viewer too.
    const selectedMedia = useMemo(() => media.find((item) => item.id === selectedMediaId) ?? null, [media, selectedMediaId]);
    const loadMoreRef = useInfiniteScrollSentinel(hasNextPage, fetchNextPage, media.length);
    const uploadMediaBatch = useUploadMediaBatch();
    const originalMedia = useOriginalMedia();
    const deleteMedia = useDeleteMedia(eventId ?? '');
    const { data: appConfig } = useAppConfig();

    const galleryEnabled = readableModuleKeys(activeEvent).has('gallery');
    const isDeleted = isEventDeleted(activeEvent);
    const canUpload = Boolean(eventId && activeMember && galleryEnabled && isEventWritable(activeEvent?.status) && !isDeleted);
    const selectedSize = useMemo(() => selectedFiles.reduce((sum, file) => sum + file.size, 0), [selectedFiles]);
    const maxArchiveSelectedItems = appConfig?.media.maxArchiveSelectedItems ?? 100;
    const maxArchivePartBytes = appConfig?.media.maxArchivePartBytes ?? 300 * 1024 * 1024;
    const gallerySelection = useGallerySelection(media, 450, maxArchiveSelectedItems);
    const selectedArchiveSize = useMemo(
        () => gallerySelection.selectedItems.reduce((sum, item) => sum + item.fileSize, 0),
        [gallerySelection.selectedItems],
    );

    const { filesPerRequest: maxFiles, imageBytes: maxImageBytes, videoBytes: maxVideoBytes } = getUploadLimits(appConfig?.media);
    // Every event keeps photo originals; videos are never re-encoded, so they have no separate original.
    const canDownloadOriginal = isHost && selectedMedia !== null && selectedMedia.mediaType !== 'VIDEO';
    const showArchiveDownload = isHost && galleryEnabled;
    // A host, or the member who uploaded it (the backend enforces the same rule). Deletes are not
    // plan-gated on the backend, so a file can still be cleared out after the gallery module is
    // gone — only a read-only or deleted event stops it.
    const isUploader = Boolean(activeMember && selectedMedia?.uploaderMemberId === activeMember.id);
    const canDeleteMedia =
        (isHost || isUploader) &&
        selectedMedia !== null &&
        isEventWritable(activeEvent?.status) &&
        !isDeleted &&
        !contentAccess.isLocked(selectedMedia.id);
    const canReportMedia =
        selectedMedia !== null &&
        canReportContent({
            isMember: Boolean(activeMember),
            isAuthor: isUploader,
            targetTypeReportable: Boolean(appConfig?.reportTargetTypes?.includes('MEDIA')),
        });
    // The dialog belongs to the item it was opened for: if the selection moves, the item leaves the list
    // or reporting stops being allowed, it is closed and stays closed.
    const reportOpen = reportMediaId !== null && reportMediaId === selectedMedia?.id && canReportMedia;
    // Forget a dialog that can no longer show, so it doesn't come back when its item or permission does.
    if (reportMediaId !== null && !reportOpen) setReportMediaId(null);
    const canDownloadSelected =
        gallerySelection.selectedCount > 0 &&
        gallerySelection.selectedCount <= maxArchiveSelectedItems &&
        selectedArchiveSize <= maxArchivePartBytes &&
        !isDownloadingSelection;
    // The selection downloads as one archive part, so it shares the part's size cap.
    const selectionTooLargeHint =
        gallerySelection.selectedCount > 0 && selectedArchiveSize > maxArchivePartBytes
            ? t('selectionTooLarge', { size: formatBytes(maxArchivePartBytes) })
            : null;

    const handleFilesChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            setUploadNotice(null);
            const picked = Array.from(event.target.files ?? []);
            const isTooLarge = (file: File) =>
                (file.type.startsWith('image/') && file.size > maxImageBytes) || (file.type.startsWith('video/') && file.size > maxVideoBytes);
            const files = picked
                .filter((file) => (file.type.startsWith('image/') || file.type.startsWith('video/')) && !isTooLarge(file))
                .slice(0, maxFiles);
            setSelectedFiles(files);
            if (picked.some(isTooLarge)) {
                setUploadNotice(t('filesTooLarge', { imageSize: formatBytes(maxImageBytes), videoSize: formatBytes(maxVideoBytes) }));
            } else if (files.length < picked.length) {
                setUploadNotice(t('selectionLimited', { count: maxFiles }));
            }
            event.target.value = '';
        },
        [maxFiles, maxImageBytes, maxVideoBytes, t],
    );

    const handleClearSelection = useCallback(() => {
        setSelectedFiles([]);
        setUploadNotice(null);
    }, []);

    const handleUpload = useCallback(async () => {
        if (!eventId || !activeMember || selectedFiles.length === 0 || !canUpload) return;

        setUploadNotice(null);
        let result;
        try {
            result = await uploadMediaBatch.mutateAsync({
                eventId,
                files: selectedFiles,
                onBusy: setIsUploadBusy,
            });
        } catch (error) {
            setUploadNotice(toErrorMessage(error, t('uploadFailed')));
            return;
        }

        setSelectedFiles([]);
        setUploadNotice(
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
        );
    }, [activeMember, canUpload, eventId, maxFiles, selectedFiles, t, toErrorMessage, uploadMediaBatch]);

    const downloadOriginal = useCallback(async () => {
        if (!selectedMedia) return;
        setOriginalError(null);
        try {
            const result = await originalMedia.mutateAsync(selectedMedia.id);
            window.location.assign(result.url);
        } catch {
            setOriginalError(t('originalUnavailable'));
        }
    }, [originalMedia, selectedMedia, t]);

    const downloadSelectedMedia = useCallback(async () => {
        if (!canDownloadSelected || !eventId) return;
        setSelectionDownloadError(null);
        setIsDownloadingSelection(true);

        try {
            const response = await api.download(
                endpoints.events.mediaArchiveSelected(
                    eventId,
                    gallerySelection.selectedItems.map((item) => item.id),
                ),
            );
            downloadBlob(await response.blob(), `gallery-selected-${gallerySelection.selectedCount}.zip`);
            gallerySelection.exitSelectionMode();
        } catch (error) {
            setSelectionDownloadError(toErrorMessage(error, t('selectionDownloadFailed')));
        } finally {
            setIsDownloadingSelection(false);
        }
    }, [canDownloadSelected, eventId, gallerySelection, t, toErrorMessage]);

    const requestDeleteMedia = useCallback(() => {
        if (!canDeleteMedia) return;
        setDeleteError(null);
        setConfirmDeleteOpen(true);
    }, [canDeleteMedia]);

    const openReport = useCallback(() => {
        if (!selectedMedia) return;
        // A page still loading for a pending Next must not move the selection under the dialog.
        pendingAdvanceIndexRef.current = null;
        setReportMediaId(selectedMedia.id);
    }, [selectedMedia]);

    const closeReport = useCallback(() => {
        setReportMediaId(null);
    }, []);

    const closeDeleteConfirm = useCallback(() => {
        setConfirmDeleteOpen(false);
    }, []);

    const confirmDeleteMedia = useCallback(async () => {
        if (!selectedMedia) return;
        try {
            await deleteMedia.mutateAsync(selectedMedia.id);
            setConfirmDeleteOpen(false);
            setSelectedMediaId(null);
        } catch (error) {
            setDeleteError(toErrorMessage(error, t('deleteMediaFailed')));
        }
    }, [deleteMedia, selectedMedia, t, toErrorMessage]);

    const selectedMediaIndex = useMemo(() => (selectedMedia ? media.findIndex((item) => item.id === selectedMedia.id) : -1), [media, selectedMedia]);
    const hasPreviousMedia = selectedMediaIndex > 0;
    const hasNextMedia = selectedMediaIndex !== -1 && (selectedMediaIndex < media.length - 1 || hasNextPage);

    const showPreviousMedia = useCallback(() => {
        if (selectedMediaIndex <= 0) return;
        setOriginalError(null);
        setSelectedMediaId(media[selectedMediaIndex - 1].id);
    }, [media, selectedMediaIndex]);

    const showNextMedia = useCallback(() => {
        if (selectedMediaIndex === -1) return;
        if (selectedMediaIndex < media.length - 1) {
            setOriginalError(null);
            setSelectedMediaId(media[selectedMediaIndex + 1].id);
            return;
        }
        if (hasNextPage) {
            pendingAdvanceIndexRef.current = selectedMediaIndex + 1;
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, media, selectedMediaIndex]);

    useEffect(() => {
        const pendingIndex = pendingAdvanceIndexRef.current;
        if (pendingIndex === null) return;
        if (pendingIndex >= media.length) return;
        pendingAdvanceIndexRef.current = null;
        setOriginalError(null);
        setSelectedMediaId(media[pendingIndex].id);
    }, [media]);

    const handleMediaClick = useCallback(
        (id: string) => {
            if (gallerySelection.consumeLongPressClick()) return;
            if (isHost && gallerySelection.selectionMode) {
                gallerySelection.toggleSelection(id);
                return;
            }
            setSelectedMediaId(id);
        },
        [gallerySelection, isHost],
    );

    const handleMediaPointerDown = useCallback(
        (event: PointerEvent<HTMLButtonElement>, id: string) => {
            if (!isHost) return;
            gallerySelection.startLongPressSelection(event, id);
        },
        [gallerySelection, isHost],
    );

    const handleMediaContextMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    }, []);

    const handleMediaPointerEnd = useCallback(() => {
        gallerySelection.stopLongPressSelection();
    }, [gallerySelection]);

    const handleScrollToTop = useCallback(() => {
        const scrollContainer = document.querySelector('main');
        if (scrollContainer instanceof HTMLElement) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const openArchiveDownload = useCallback(() => {
        setArchiveDownloadOpen(true);
    }, []);

    const closeArchiveDownload = useCallback(() => {
        setArchiveDownloadOpen(false);
    }, []);

    const enterSelectionMode = useCallback(() => {
        gallerySelection.enterSelectionMode();
        setSelectionDownloadError(null);
    }, [gallerySelection]);

    const exitSelectionMode = useCallback(() => {
        gallerySelection.exitSelectionMode();
        setSelectionDownloadError(null);
    }, [gallerySelection]);

    const closeMedia = useCallback(() => {
        setSelectedMediaId(null);
        setOriginalError(null);
        setReportMediaId(null);
    }, []);

    useEffect(() => {
        if (!gallerySelection.selectionMode) {
            showMobileTabBar('gallery-selection');
            return;
        }

        hideMobileTabBar('gallery-selection');
        return () => {
            showMobileTabBar('gallery-selection');
        };
    }, [gallerySelection.selectionMode, hideMobileTabBar, showMobileTabBar]);

    return {
        activeEvent,
        eventId,
        isHost,
        isDeleted,
        galleryEnabled,
        canUpload,
        showArchiveDownload,
        showGalleryActions: isHost && galleryEnabled,
        selectedFiles,
        selectedSize,
        uploadNotice: isUploadBusy ? t('uploadBusy') : uploadNotice,
        selectedMedia,
        originalError,
        selectionDownloadError,
        isDownloadingSelection,
        archiveDownloadOpen,
        media,
        isLoadingMedia,
        loadMoreRef,
        isFetchingNextPage,
        hasPreviousMedia,
        hasNextMedia,
        showPreviousMedia,
        showNextMedia,
        gallerySelection,
        uploadMediaBatch,
        originalMedia,
        canDownloadOriginal,
        canDownloadSelected,
        selectionTooLargeHint,
        canDeleteMedia,
        canReportMedia,
        reportOpen,
        openReport,
        closeReport,
        confirmDeleteOpen,
        deleteError,
        deleteMedia,
        requestDeleteMedia,
        closeDeleteConfirm,
        confirmDeleteMedia,
        maxFiles,
        handleFilesChange,
        handleClearSelection,
        handleUpload,
        downloadOriginal,
        downloadSelectedMedia,
        handleMediaClick,
        handleMediaPointerDown,
        handleMediaPointerEnd,
        handleMediaContextMenu,
        handleScrollToTop,
        openArchiveDownload,
        closeArchiveDownload,
        enterSelectionMode,
        exitSelectionMode,
        closeMedia,
        router,
    } as const;
}
