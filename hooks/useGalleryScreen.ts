'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling } from '@/hooks/useBilling';
import { useGallerySelection } from '@/hooks/useGallerySelection';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useEventMedia, useOriginalMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import type { MediaResponseDto } from '@/lib/api/types';
import { downloadBlob, downloadUrl } from '@/lib/download';
import { isEventWritable } from '@/lib/eventLifecycle';
import { formatBytes } from '@/lib/format';
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
    const imageMedia = useMemo(() => media.filter((item) => item.mediaType === 'IMAGE'), [media]);
    const gallerySelection = useGallerySelection(imageMedia);

    const maxFiles = appConfig?.media.maxBatchUploadFiles ?? MAX_FILES_PER_BATCH;
    const maxImageBytes = appConfig?.media.maxImageBytes ?? 25 * 1024 * 1024;
    const keepsOriginals = billing.data?.addons.some((addon) => addon.code === 'ORIGINALS') ?? false;
    const showArchiveDownload = isHost && galleryEnabled;
    const canDownloadSelected = gallerySelection.selectedCount > 0 && !isDownloadingSelection;

    const handleFilesChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            setUploadNotice(null);
            const files = Array.from(event.target.files ?? [])
                .filter((file) => file.type.startsWith('image/'))
                .filter((file) => file.size <= maxImageBytes)
                .slice(0, maxFiles);
            setSelectedFiles(files);
            if (files.length < (event.target.files?.length ?? 0)) {
                setUploadNotice(t('selectionLimited', { count: maxFiles, size: formatBytes(maxImageBytes) }));
            }
            event.target.value = '';
        },
        [maxFiles, maxImageBytes, t]
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

    const downloadGalleryItem = useCallback(
        async (item: MediaResponseDto) => {
            const filename = item.originalFilename || `${item.id}.jpg`;
            let url = item.mediaUrl;

            if (keepsOriginals) {
                try {
                    const result = await originalMedia.mutateAsync(item.id);
                    url = result.url;
                } catch {
                    url = item.mediaUrl;
                }
            }

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Download failed');
                downloadBlob(await response.blob(), filename);
            } catch {
                downloadUrl(url, filename);
            }
        },
        [keepsOriginals, originalMedia]
    );

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
        if (!canDownloadSelected) return;
        setSelectionDownloadError(null);
        setIsDownloadingSelection(true);

        try {
            for (const item of gallerySelection.selectedItems) {
                await downloadGalleryItem(item);
            }
            gallerySelection.exitSelectionMode();
        } catch {
            setSelectionDownloadError(t('selectionDownloadFailed'));
        } finally {
            setIsDownloadingSelection(false);
        }
    }, [canDownloadSelected, downloadGalleryItem, gallerySelection, t]);

    const handleMediaClick = useCallback(
        (id: string) => {
            if (gallerySelection.consumeLongPressClick()) return;
            if (gallerySelection.selectionMode) {
                gallerySelection.toggleSelection(id);
                return;
            }
            setSelectedMedia(imageMedia.find((item) => item.id === id) ?? null);
        },
        [gallerySelection, imageMedia]
    );

    const handleMediaPointerDown = useCallback(
        (event: PointerEvent<HTMLButtonElement>, id: string) => {
            gallerySelection.startLongPressSelection(event, id);
        },
        [gallerySelection]
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
        showGalleryActions: galleryEnabled,
        selectedFiles,
        selectedSize,
        uploadNotice,
        selectedMedia,
        originalError,
        selectionDownloadError,
        isDownloadingSelection,
        archiveDownloadOpen,
        imageMedia,
        isLoadingMedia,
        loadMoreRef,
        isFetchingNextPage,
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
