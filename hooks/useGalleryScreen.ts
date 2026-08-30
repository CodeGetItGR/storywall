'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling } from '@/hooks/useBilling';
import { useGallerySelection } from '@/hooks/useGallerySelection';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useEventMedia, useOriginalMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MediaResponseDto } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { isEventWritable } from '@/lib/eventLifecycle';
import { useActiveMember } from '@/providers/EventProvider';
import { useMobileChrome } from '@/providers/MobileChromeProvider';

const MAX_FILES_PER_BATCH = 10;

export function useGalleryScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const activeMember = useActiveMember();
    const t = useTranslations('GalleryPage');
    const toErrorMessage = useApiErrorMessage();
    const router = useRouter();
    const { hideMobileTabBar, showMobileTabBar } = useMobileChrome();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadNotice, setUploadNotice] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaResponseDto | null>(null);
    const [originalError, setOriginalError] = useState<string | null>(null);
    const [selectionDownloadError, setSelectionDownloadError] = useState<string | null>(null);
    const [isDownloadingSelection, setIsDownloadingSelection] = useState(false);
    const [archiveDownloadOpen, setArchiveDownloadOpen] = useState(false);
    const pendingAdvanceIndexRef = useRef<number | null>(null);

    const { data: mediaPages, isLoading: isLoadingMedia, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventMedia(eventId);
    const media = useMemo(() => mediaPages?.pages.flatMap((page) => page.content) ?? [], [mediaPages?.pages]);
    const loadMoreRef = useInfiniteScrollSentinel(hasNextPage, fetchNextPage, media.length);
    const uploadMediaBatch = useUploadMediaBatch();
    const originalMedia = useOriginalMedia();
    const { data: appConfig } = useAppConfig();
    const billing = useEventBilling(eventId, isHost);

    const galleryModule = activeEvent?.modules.find((module) => module.moduleKey === 'gallery');
    const galleryEnabled = galleryModule?.isAvailable ?? false;
    const canUpload = Boolean(eventId && activeMember && galleryEnabled && isEventWritable(activeEvent?.status));
    const selectedSize = useMemo(() => selectedFiles.reduce((sum, file) => sum + file.size, 0), [selectedFiles]);
    const maxArchiveSelectedItems = appConfig?.media.maxArchiveSelectedItems ?? 100;
    const maxArchivePartBytes = appConfig?.media.maxArchivePartBytes ?? 2 * 1024 * 1024 * 1024;
    const gallerySelection = useGallerySelection(media, 450, maxArchiveSelectedItems);
    const selectedArchiveSize = useMemo(
        () => gallerySelection.selectedItems.reduce((sum, item) => sum + item.fileSize, 0),
        [gallerySelection.selectedItems]
    );

    const maxFiles = appConfig?.media.maxBatchUploadFiles ?? MAX_FILES_PER_BATCH;
    const maxImageBytes = appConfig?.media.maxImageBytes ?? 25 * 1024 * 1024;
    const maxVideoBytes = appConfig?.media.maxVideoBytes ?? 200 * 1024 * 1024;
    const keepsOriginals = isHost && (billing.data?.addons.some((addon) => addon.code === 'ORIGINALS') ?? false);
    const showArchiveDownload = isHost && galleryEnabled;
    const canDownloadSelected =
        gallerySelection.selectedCount > 0 &&
        gallerySelection.selectedCount <= maxArchiveSelectedItems &&
        selectedArchiveSize <= maxArchivePartBytes &&
        !isDownloadingSelection;

    const handleFilesChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            setUploadNotice(null);
            const files = Array.from(event.target.files ?? [])
                .filter((file) => {
                    if (file.type.startsWith('image/')) return file.size <= maxImageBytes;
                    if (file.type.startsWith('video/')) return file.size <= maxVideoBytes;
                    return false;
                })
                .slice(0, maxFiles);
            setSelectedFiles(files);
            if (files.length < (event.target.files?.length ?? 0)) {
                setUploadNotice(t('selectionLimited', { count: maxFiles }));
            }
            event.target.value = '';
        },
        [maxFiles, maxImageBytes, maxVideoBytes, t]
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
                uploaderMemberId: activeMember.id,
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
                : t('uploadComplete', { count: result.created.length, failed: 0 })
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
                    gallerySelection.selectedItems.map((item) => item.id)
                )
            );
            downloadBlob(await response.blob(), `gallery-selected-${gallerySelection.selectedCount}.zip`);
            gallerySelection.exitSelectionMode();
        } catch (error) {
            setSelectionDownloadError(toErrorMessage(error, t('selectionDownloadFailed')));
        } finally {
            setIsDownloadingSelection(false);
        }
    }, [canDownloadSelected, eventId, gallerySelection, t, toErrorMessage]);

    const selectedMediaIndex = useMemo(
        () => (selectedMedia ? media.findIndex((item) => item.id === selectedMedia.id) : -1),
        [media, selectedMedia]
    );
    const hasPreviousMedia = selectedMediaIndex > 0;
    const hasNextMedia = selectedMediaIndex !== -1 && (selectedMediaIndex < media.length - 1 || hasNextPage);

    const showPreviousMedia = useCallback(() => {
        if (selectedMediaIndex <= 0) return;
        setOriginalError(null);
        setSelectedMedia(media[selectedMediaIndex - 1]);
    }, [media, selectedMediaIndex]);

    const showNextMedia = useCallback(() => {
        if (selectedMediaIndex === -1) return;
        if (selectedMediaIndex < media.length - 1) {
            setOriginalError(null);
            setSelectedMedia(media[selectedMediaIndex + 1]);
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
        setSelectedMedia(media[pendingIndex]);
    }, [media]);

    const handleMediaClick = useCallback(
        (id: string) => {
            if (gallerySelection.consumeLongPressClick()) return;
            if (isHost && gallerySelection.selectionMode) {
                gallerySelection.toggleSelection(id);
                return;
            }
            setSelectedMedia(media.find((item) => item.id === id) ?? null);
        },
        [gallerySelection, isHost, media]
    );

    const handleMediaPointerDown = useCallback(
        (event: PointerEvent<HTMLButtonElement>, id: string) => {
            if (!isHost) return;
            gallerySelection.startLongPressSelection(event, id);
        },
        [gallerySelection, isHost]
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
        setSelectedMedia(null);
        setOriginalError(null);
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
        galleryEnabled,
        canUpload,
        showArchiveDownload,
        showGalleryActions: isHost && galleryEnabled,
        selectedFiles,
        selectedSize,
        uploadNotice,
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
        keepsOriginals,
        canDownloadSelected,
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
