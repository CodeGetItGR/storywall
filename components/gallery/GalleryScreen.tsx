'use client';

import { Download, Images, MousePointer2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { GalleryArchiveDownloadModal } from '@/components/gallery/GalleryArchiveDownloadModal';
import { GalleryMediaGrid } from '@/components/gallery/GalleryMediaGrid';
import { GallerySelectionActions } from '@/components/gallery/GallerySelectionActions';
import { GallerySelectionBar } from '@/components/gallery/GallerySelectionBar';
import { GalleryUploadSection } from '@/components/gallery/GalleryUploadSection';
import { GalleryViewer } from '@/components/gallery/GalleryViewer';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import { formatDate } from '@/lib/datetime';
import { routes } from '@/lib/routes';

export function GalleryScreen() {
    const t = useTranslations('GalleryPage');
    const locale = useLocale();
    const {
        activeEvent,
        eventId,
        isHost,
        isDeleted,
        galleryEnabled,
        canUpload,
        showArchiveDownload,
        showGalleryActions,
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
        canDownloadOriginal,
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
    } = useGalleryScreen();
    const deletionDate = activeEvent?.deletionScheduledFor ? formatDate(locale, activeEvent.deletionScheduledFor, { dateStyle: 'long' }) : null;

    return (
        <ModulePageShell
            maxWidth="5xl"
            title={t('title')}
            icon={Images}
            iconClassName="text-cyan-600"
            backLabel={t('backToTools')}
            backHref={isDeleted ? routes.events.manage(eventId) : routes.events.feed(eventId)}
            subtitle={isHost ? t('hostSubtitle') : t('guestSubtitle')}
            notice={
                <>
                    {!galleryEnabled && <ModuleNotice>{t('moduleUnavailable')}</ModuleNotice>}
                    {isDeleted && deletionDate && <ModuleNotice tone="warning">{t('deletedReadOnly', { date: deletionDate })}</ModuleNotice>}
                </>
            }
        >
            {/* Upload */}
            {!isDeleted && (
                <GalleryUploadSection
                    canUpload={canUpload}
                    selectedFiles={selectedFiles}
                    selectedSize={selectedSize}
                    uploadNotice={uploadNotice}
                    maxFiles={maxFiles}
                    isUploading={uploadMediaBatch.isPending}
                    onFilesChange={handleFilesChange}
                    onClearSelection={handleClearSelection}
                    onUpload={handleUpload}
                />
            )}

            <section className={'mb-5'}>
                {showGalleryActions ? (
                    <div className="flex items-center gap-2">
                        {/* Header actions */}
                        {gallerySelection.selectionMode ? (
                            <GallerySelectionActions
                                selectedCount={gallerySelection.selectedCount}
                                mediaCount={media.length}
                                canDownloadSelected={canDownloadSelected}
                                onSelectAll={gallerySelection.selectAll}
                                onDownloadSelected={downloadSelectedMedia}
                                onExitSelection={exitSelectionMode}
                            />
                        ) : (
                            <div className={'flex w-full justify-between gap-2'}>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={enterSelectionMode}
                                    disabled={!media.length}
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
                                        className="inline-flex rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        {t('downloadGallery')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ) : undefined}
            </section>

            {/* Selection bar */}
            {isHost && (
                <GallerySelectionBar
                    visible={gallerySelection.selectionMode}
                    selectedCount={gallerySelection.selectedCount}
                    mediaCount={media.length}
                    canDownloadSelected={canDownloadSelected}
                    isDownloadingSelection={isDownloadingSelection}
                    onSelectAll={gallerySelection.selectAll}
                    onDownloadSelected={downloadSelectedMedia}
                    onExitSelection={exitSelectionMode}
                    onScrollToTop={handleScrollToTop}
                />
            )}

            {/* Gallery */}
            {selectionDownloadError && <p className="mb-3 text-xs text-rose-600">{selectionDownloadError}</p>}
            <GalleryMediaGrid
                isLoading={isLoadingMedia}
                isFetchingNextPage={isFetchingNextPage}
                items={media}
                selectedIds={gallerySelection.selectedIds}
                selectionMode={gallerySelection.selectionMode}
                loadMoreRef={loadMoreRef}
                onMediaClick={handleMediaClick}
                onMediaPointerDown={handleMediaPointerDown}
                onMediaPointerEnd={handleMediaPointerEnd}
                onMediaContextMenu={handleMediaContextMenu}
            />

            {/* Floating actions spacer — keeps the last row clear of the lg+ floating selection bar */}
            {gallerySelection.selectionMode && <div aria-hidden className="hidden h-28 lg:block" />}

            {/* Viewer */}
            <GalleryViewer
                media={selectedMedia}
                canDownloadOriginal={canDownloadOriginal}
                originalError={originalError}
                isDownloadingOriginal={originalMedia.isPending}
                hasPrevious={hasPreviousMedia}
                hasNext={hasNextMedia}
                onClose={closeMedia}
                onDownloadOriginal={downloadOriginal}
                onPrevious={showPreviousMedia}
                onNext={showNextMedia}
            />

            {/* Archive download */}
            {showArchiveDownload && eventId && (
                <GalleryArchiveDownloadModal eventId={eventId} open={archiveDownloadOpen} onClose={closeArchiveDownload} />
            )}
        </ModulePageShell>
    );
}
