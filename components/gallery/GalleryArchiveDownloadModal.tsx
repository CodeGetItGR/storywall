'use client';

import { Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useGalleryArchiveManifest } from '@/hooks/useGalleryArchive';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { MediaArchiveVariant } from '@/lib/api/types';
import { downloadBlob } from '@/lib/download';
import { formatBytes, formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';

interface GalleryArchiveDownloadModalProps {
    eventId: string;
    open: boolean;
    onClose: () => void;
    preferOriginals?: boolean;
}

export function GalleryArchiveDownloadModal({ eventId, open, onClose, preferOriginals = false }: GalleryArchiveDownloadModalProps) {
    const t = useTranslations('GalleryPage');
    const tError = useApiErrorMessage();
    const [variant, setVariant] = useState<MediaArchiveVariant>(preferOriginals ? 'ORIGINAL' : 'DISPLAY');
    const [activePart, setActivePart] = useState<number | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const manifestQuery = useGalleryArchiveManifest(eventId, variant, open);
    const manifest = manifestQuery.data;
    const totalParts = manifest?.parts.length ?? 1;

    const handleSelectDisplayVariant = useCallback(() => {
        setVariant('DISPLAY');
    }, []);

    const handleSelectOriginalVariant = useCallback(() => {
        setVariant('ORIGINAL');
    }, []);

    const totalsLabel = useMemo(() => {
        if (!manifest) return null;
        if (manifest.originalsAvailable) {
            return t('archiveTotalsWithOriginals', {
                originals: formatBytes(manifest.originalTotalBytes),
                display: formatBytes(manifest.displayTotalBytes),
            });
        }
        return t('archiveTotalsDisplayOnly', { display: formatBytes(manifest.displayTotalBytes) });
    }, [manifest, t]);

    const downloadPart = useCallback(
        async (part: number) => {
            setDownloadError(null);
            setActivePart(part);

            const runDownload = async () => {
                const response = await api.download(endpoints.events.mediaArchive(eventId, part, variant));
                const blob = await response.blob();
                downloadBlob(blob, `gallery-part${part}-of-${totalParts}.zip`);
            };

            try {
                await runDownload();
            } catch (error) {
                if (getErrorCode(error) === ERROR_CODES.MEDIA_ARCHIVE_PART_NOT_FOUND) {
                    const refreshed = await manifestQuery.refetch();
                    const nextManifest = refreshed.data;
                    if (nextManifest?.parts.some((entry) => entry.part === part)) {
                        try {
                            await runDownload();
                            return;
                        } catch (retryError) {
                            setDownloadError(tError(retryError, t('archiveDownloadFailed')));
                            return;
                        }
                    }

                    setDownloadError(t('archiveManifestRefreshed'));
                    return;
                }

                setDownloadError(tError(error, t('archiveDownloadFailed')));
            } finally {
                setActivePart(null);
            }
        },
        [eventId, manifestQuery, t, tError, totalParts, variant]
    );

    const handlePartClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const part = Number(event.currentTarget.dataset.part);
            if (!Number.isFinite(part)) return;
            void downloadPart(part);
        },
        [downloadPart]
    );

    return (
        <Modal
            key={open ? 'open' : 'closed'}
            open={open}
            onClose={onClose}
            variant="sheet"
            size="lg"
            closeLabel={t('closeDownloadGallery')}
            ariaLabel={t('downloadGalleryTitle')}
        >
            <Modal.Body className="px-4 pb-4 pt-12 sm:px-5">
                <div className="flex h-full min-h-0 flex-col">
                    {/* Header */}
                    <div className="pr-8">
                        <p className="text-lg font-bold text-ink">{t('downloadGalleryTitle')}</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('downloadGallerySubtitle')}</p>
                    </div>

                    {/* Summary */}
                    <div className="mt-5 rounded-2xl border border-border/70 bg-surface-muted/40 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('archiveSummaryTitle')}</p>
                                <p className="mt-1 text-sm leading-relaxed text-ink">{totalsLabel}</p>
                            </div>
                            {manifest?.originalsAvailable && (
                                <div className="inline-flex self-start rounded-full border border-border bg-background p-1">
                                    <button
                                        type="button"
                                        onClick={handleSelectDisplayVariant}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                            variant === 'DISPLAY' ? 'bg-ink text-background shadow-sm' : 'text-ink-muted hover:text-ink'
                                        )}
                                    >
                                        {t('displayVariant')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSelectOriginalVariant}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                            variant === 'ORIGINAL' ? 'bg-ink text-background shadow-sm' : 'text-ink-muted hover:text-ink'
                                        )}
                                    >
                                        {t('originalVariant')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-muted">
                            <span>
                                {t('archivePhotos')}: <span className="font-semibold text-ink">{manifest ? formatCount(manifest.photoCount) : '0'}</span>
                            </span>
                            <span>
                                {t('archiveVideos')}: <span className="font-semibold text-ink">{manifest ? formatCount(manifest.videoCount) : '0'}</span>
                            </span>
                            <span>
                                {t('archiveParts')}: <span className="font-semibold text-ink">{manifest ? formatCount(manifest.parts.length) : '0'}</span>
                            </span>
                        </div>

                        {manifest?.variant === 'ORIGINAL' && manifest.itemsWithoutOriginal > 0 && (
                            <p className="mt-3 text-xs leading-relaxed text-amber-700">
                                {t('archiveWithoutOriginal', { count: formatCount(manifest.itemsWithoutOriginal) })}
                            </p>
                        )}
                    </div>

                    {/* Parts */}
                    <div className="mt-5 min-h-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-ink">{t('archivePartListTitle')}</p>
                            {manifestQuery.isFetching && manifest && <Loader2 className="h-4 w-4 animate-spin text-ink-muted" />}
                        </div>

                        {manifestQuery.isLoading ? (
                            <div className="py-6 text-center text-sm text-ink-muted">{t('archiveLoading')}</div>
                        ) : manifestQuery.isError ? (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {tError(manifestQuery.error, t('archiveManifestFailed'))}
                            </div>
                        ) : manifest && manifest.parts.length === 0 ? (
                            <div className="py-6 text-center text-sm text-ink-muted">{t('archiveEmpty')}</div>
                        ) : (
                            <div className="max-h-[46vh] overflow-y-auto rounded-2xl border border-border/70 bg-background">
                                {manifest?.parts.map((part) => {
                                    const isDownloading = activePart === part.part;
                                    return (
                                        <button
                                            key={part.part}
                                            type="button"
                                            data-part={part.part}
                                            onClick={handlePartClick}
                                            disabled={activePart !== null}
                                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-ink">
                                                    {t('archivePartLabel', { part: part.part, total: manifest.parts.length })}
                                                </p>
                                                <p className="mt-1 text-xs text-ink-muted">
                                                    {t('archivePartMeta', {
                                                        count: formatCount(part.itemCount),
                                                        size: formatBytes(part.sizeBytes),
                                                    })}
                                                </p>
                                            </div>
                                            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted">
                                                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                {isDownloading ? t('archiveDownloading') : t('archiveDownload')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Errors */}
                    {downloadError && <p className="mt-3 text-xs leading-relaxed text-rose-600">{downloadError}</p>}
                </div>
            </Modal.Body>
        </Modal>
    );
}
