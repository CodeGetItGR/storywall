'use client';

import { Check, Download, ImagePlus, Images, Loader2, MousePointer2, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import { GalleryArchiveDownloadModal } from '@/components/gallery/GalleryArchiveDownloadModal';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventBilling } from '@/hooks/useBilling';
import { useGallerySelection } from '@/hooks/useGallerySelection';
import { useEventMedia, useOriginalMedia, useUploadMediaBatch } from '@/hooks/useMedia';
import type { MediaResponseDto } from '@/lib/api/types';
import { formatShortDateTime } from '@/lib/datetime';
import { downloadBlob, downloadUrl } from '@/lib/download';
import { isEventWritable } from '@/lib/eventLifecycle';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

const MAX_FILES_PER_BATCH = 10;

export function GalleryScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const activeMember = useActiveMember();
    const t = useTranslations('GalleryPage');
    const toErrorMessage = useApiErrorMessage();
    const router = useRouter();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadNotice, setUploadNotice] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaResponseDto | null>(null);
    const [originalError, setOriginalError] = useState<string | null>(null);
    const [selectionDownloadError, setSelectionDownloadError] = useState<string | null>(null);
    const [isDownloadingSelection, setIsDownloadingSelection] = useState(false);
    const [archiveDownloadOpen, setArchiveDownloadOpen] = useState(false);

    const { data: media = [], isLoading: isLoadingMedia } = useEventMedia(eventId);
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
    const showGalleryActions = galleryEnabled;
    const canDownloadSelected = gallerySelection.selectedCount > 0 && !isDownloadingSelection;
    const openArchiveDownload = useCallback(() => {
        setArchiveDownloadOpen(true);
    }, []);

    const closeArchiveDownload = useCallback(() => {
        setArchiveDownloadOpen(false);
    }, []);

    const handleFilesChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
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

    async function downloadOriginal() {
        if (!selectedMedia) return;
        setOriginalError(null);
        try {
            const result = await originalMedia.mutateAsync(selectedMedia.id);
            window.location.assign(result.url);
        } catch {
            setOriginalError(t('originalUnavailable'));
        }
    }

    async function downloadGalleryItem(item: MediaResponseDto) {
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
    }

    async function downloadSelectedMedia() {
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
    }

    function openMedia(event: React.MouseEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.mediaId;
        if (!id) return;
        if (gallerySelection.consumeLongPressClick()) return;
        if (gallerySelection.selectionMode) {
            gallerySelection.toggleSelection(id);
            return;
        }
        setSelectedMedia(imageMedia.find((item) => item.id === id) ?? null);
    }

    function handleMediaPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        const id = event.currentTarget.dataset.mediaId;
        if (!id) return;
        gallerySelection.startLongPressSelection(event, id);
    }

    function enterSelectionMode() {
        gallerySelection.enterSelectionMode();
        setSelectionDownloadError(null);
    }

    function exitSelectionMode() {
        gallerySelection.exitSelectionMode();
        setSelectionDownloadError(null);
    }

    function closeMedia() {
        setSelectedMedia(null);
        setOriginalError(null);
    }

    return (
        <ModulePageShell
            maxWidth="5xl"
            title={t('title')}
            icon={Images}
            iconClassName="text-cyan-600"
            backLabel={t('backToTools')}
            onBack={router.back}
            subtitle={isHost ? t('hostSubtitle') : t('guestSubtitle')}
            action={
                showGalleryActions ? (
                    <div className="flex items-center gap-2">
                        {gallerySelection.selectionMode ? (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={gallerySelection.selectAll}
                                    disabled={!imageMedia.length || gallerySelection.selectedCount === imageMedia.length}
                                    className="hidden rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink sm:inline-flex"
                                >
                                    {t('selectAll')}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={downloadSelectedMedia}
                                    disabled={!canDownloadSelected}
                                    className="hidden rounded-full bg-ink px-3 text-xs font-semibold text-white sm:inline-flex"
                                >
                                    {isDownloadingSelection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                    {t('downloadSelected', { count: gallerySelection.selectedCount })}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={exitSelectionMode}
                                    className="hidden rounded-full px-3 text-xs font-semibold text-ink-muted hover:text-ink sm:inline-flex"
                                >
                                    {t('cancelSelection')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={enterSelectionMode}
                                    disabled={!imageMedia.length}
                                    className="rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink"
                                >
                                    <MousePointer2 className="h-3.5 w-3.5" />
                                    {t('selectPhotos')}
                                </Button>
                                {showArchiveDownload && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={openArchiveDownload}
                                        disabled={!media.length}
                                        className="hidden rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink sm:inline-flex"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        {t('downloadGallery')}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                ) : undefined
            }
            notice={
                <>
                    {!galleryEnabled && <ModuleNotice>{t('moduleUnavailable')}</ModuleNotice>}
                    {activeEvent.status === 'FROZEN' && <ModuleNotice tone="info">{t('eventFrozen')}</ModuleNotice>}
                </>
            }
        >
            {/* Upload */}
            <section className="mb-5 rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold text-ink">{t('uploadTitle')}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t('uploadHint', { count: maxFiles })}</p>
                    </div>
                    <label
                        className={cn(
                            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity',
                            canUpload
                                ? 'bg-gradient-brand text-white hover:opacity-90'
                                : 'cursor-not-allowed bg-surface-muted text-ink-muted opacity-60'
                        )}
                    >
                        <UploadCloud className="h-4 w-4" />
                        {t('choosePhotos')}
                        <input type="file" accept="image/*" multiple disabled={!canUpload} onChange={handleFilesChange} className="sr-only" />
                    </label>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="mt-4 rounded-xl bg-surface-muted/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-ink">
                                {t('selectedSummary', { count: selectedFiles.length, size: formatBytes(selectedSize) })}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
                                >
                                    {t('clear')}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={uploadMediaBatch.isPending}
                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                    {uploadMediaBatch.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {t('upload')}
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedFiles.map((file) => (
                                <span
                                    key={`${file.name}-${file.size}`}
                                    className="rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-ink-muted"
                                >
                                    {file.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {uploadNotice && <p className="mt-3 text-xs text-ink-muted">{uploadNotice}</p>}
            </section>

            {/* Gallery */}
            <section>
                {gallerySelection.selectionMode && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-muted px-3 py-2.5">
                        <p className="text-xs font-semibold text-ink">{t('photosSelected', { count: gallerySelection.selectedCount })}</p>
                        <div className="flex items-center gap-2 sm:hidden">
                            <button
                                type="button"
                                onClick={gallerySelection.selectAll}
                                disabled={!imageMedia.length || gallerySelection.selectedCount === imageMedia.length}
                                className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted disabled:opacity-50"
                            >
                                {t('selectAll')}
                            </button>
                            <button
                                type="button"
                                onClick={downloadSelectedMedia}
                                disabled={!canDownloadSelected}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
                            >
                                {isDownloadingSelection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                {t('download')}
                            </button>
                            <button
                                type="button"
                                onClick={exitSelectionMode}
                                className="min-h-9 rounded-full px-3 text-xs font-semibold text-ink-muted"
                            >
                                {t('cancelSelection')}
                            </button>
                        </div>
                    </div>
                )}
                {selectionDownloadError && <p className="mb-3 text-xs text-rose-600">{selectionDownloadError}</p>}
                {isLoadingMedia ? (
                    <div className="flex min-h-48 items-center justify-center rounded-2xl bg-card">
                        <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
                    </div>
                ) : imageMedia.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        <ImagePlus className="mx-auto h-8 w-8 text-ink-faint" />
                        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('emptyTitle')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {imageMedia.map((item) => {
                            const isSelected = gallerySelection.selectedIds.has(item.id);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    data-media-id={item.id}
                                    aria-pressed={gallerySelection.selectionMode ? isSelected : undefined}
                                    aria-label={
                                        gallerySelection.selectionMode
                                            ? t(isSelected ? 'unselectPhoto' : 'selectPhoto', { filename: item.originalFilename })
                                            : item.originalFilename
                                    }
                                    onPointerDown={handleMediaPointerDown}
                                    onPointerUp={gallerySelection.stopLongPressSelection}
                                    onPointerCancel={gallerySelection.stopLongPressSelection}
                                    onPointerLeave={gallerySelection.stopLongPressSelection}
                                    onClick={openMedia}
                                    className={cn(
                                        'group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                                        isSelected ? 'border-primary ring-4 ring-primary/15' : 'border-border',
                                        gallerySelection.selectionMode && 'touch-none'
                                    )}
                                >
                                    <div className="relative aspect-square bg-surface-muted">
                                        <Image
                                            src={item.mediaUrl}
                                            alt={item.originalFilename}
                                            fill
                                            sizes="(min-width: 1024px) 25vw, 50vw"
                                            className={cn(
                                                'object-cover transition-transform group-hover:scale-[1.02]',
                                                isSelected && 'brightness-75'
                                            )}
                                        />
                                        {gallerySelection.selectionMode && (
                                            <span
                                                className={cn(
                                                    'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-white shadow-sm',
                                                    isSelected ? 'border-primary bg-primary' : 'border-white/80 bg-black/35'
                                                )}
                                            >
                                                {isSelected && <Check className="h-4 w-4" />}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-3 py-2 text-left">
                                        <p className="truncate text-xs font-semibold text-ink">{item.originalFilename}</p>
                                        <p className="mt-0.5 text-[11px] text-ink-muted">{formatShortDateTime(item.createdAt)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Viewer */}
            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('viewerLabel')}
                >
                    <button
                        type="button"
                        onClick={closeMedia}
                        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
                        aria-label={t('closeViewer')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex max-h-full max-w-5xl flex-col items-center gap-3">
                        <div className="relative h-[70vh] w-[90vw] max-w-5xl">
                            <Image src={selectedMedia.mediaUrl} alt={selectedMedia.originalFilename} fill sizes="90vw" className="object-contain" />
                        </div>
                        {keepsOriginals && (
                            <button
                                type="button"
                                onClick={downloadOriginal}
                                disabled={originalMedia.isPending}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                            >
                                {originalMedia.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                {t('downloadOriginal')}
                            </button>
                        )}
                        {originalError && <p className="text-xs text-rose-200">{originalError}</p>}
                    </div>
                </div>
            )}

            {/* Archive download */}
            {showArchiveDownload && (
                <GalleryArchiveDownloadModal
                    eventId={eventId}
                    open={archiveDownloadOpen}
                    onClose={closeArchiveDownload}
                    preferOriginals={keepsOriginals}
                />
            )}
        </ModulePageShell>
    );
}
