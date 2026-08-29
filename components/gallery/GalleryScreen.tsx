'use client';

import { Download, Images, MousePointer2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GalleryArchiveDownloadModal } from '@/components/gallery/GalleryArchiveDownloadModal';
import { GalleryMediaGrid } from '@/components/gallery/GalleryMediaGrid';
import { GallerySelectionBar } from '@/components/gallery/GallerySelectionBar';
import { GalleryUploadSection } from '@/components/gallery/GalleryUploadSection';
import { GalleryViewer } from '@/components/gallery/GalleryViewer';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { useGalleryScreen } from '@/hooks/useGalleryScreen';
import { routes } from '@/lib/routes';

export function GalleryScreen() {
    const t = useTranslations('GalleryPage');
    const {
        eventId,
        isHost,
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
    } = useGalleryScreen();

    return (
        <ModulePageShell
            maxWidth="5xl"
            title={t('title')}
            icon={Images}
            iconClassName="text-cyan-600"
            backLabel={t('backToTools')}
            backHref={routes.events.feed(eventId)}
            subtitle={isHost ? t('hostSubtitle') : t('guestSubtitle')}
            notice={!galleryEnabled && <ModuleNotice>{t('moduleUnavailable')}</ModuleNotice>}
        >
            {/* Upload */}
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

            <section className={'mb-5'}>
                { showGalleryActions ? (
                    <div className="flex items-center gap-2">
                        {/* Header actions */}
                        {gallerySelection.selectionMode ? (
                            <div className={'w-full flex justify-between gap-2'}>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={exitSelectionMode}
                                    className="rounded-full px-3 text-xs font-semibold text-ink-muted hover:text-ink inline-flex"
                                >
                                    {t('cancelSelection')}
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={downloadSelectedMedia}
                                    disabled={!canDownloadSelected}
                                    className="rounded-full bg-ink px-3 text-xs font-semibold text-white hidden sm:inline-flex"
                                >
                                    {t('downloadSelected', { count: gallerySelection.selectedCount })}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={gallerySelection.selectAll}
                                    disabled={!media.length || gallerySelection.selectedCount === media.length}
                                    className="rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink hidden sm:inline-flex"
                                >
                                    {t('selectAll')}
                                </Button>
                            </div>
                        ) : (
                            <div className={'w-full flex justify-between gap-2'}>
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
                                        className="rounded-full border-border bg-background px-3 text-xs font-semibold text-ink-muted hover:text-ink inline-flex"
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

            {/* Viewer */}
            <GalleryViewer
                media={selectedMedia}
                keepsOriginals={keepsOriginals}
                originalError={originalError}
                isDownloadingOriginal={originalMedia.isPending}
                onClose={closeMedia}
                onDownloadOriginal={downloadOriginal}
            />

            {/* Archive download */}
            {showArchiveDownload && eventId && (
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
