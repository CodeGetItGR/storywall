'use client';

import { Download, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type MouseEvent, useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useMemberArchive } from '@/hooks/useMemberArchive';
import { dateTimeFormat, formatBytes } from '@/lib/format';
import { assignLocation } from '@/lib/navigation';

// Only a presigned https link is followed; anything else from the response is refused.
function isHttpsUrl(url: string): boolean {
    try {
        return new URL(url).protocol === 'https:';
    } catch {
        return false;
    }
}

interface MemberArchiveModalProps {
    eventId: string;
    open: boolean;
    onClose: () => void;
}

// The guests' download: the archive the backend builds once after the event, in display quality.
// Each click asks for a fresh link and navigates to it — the R2 object carries
// Content-Disposition: attachment, so the browser saves it and the page stays put.
export function MemberArchiveModal({ eventId, open, onClose }: MemberArchiveModalProps) {
    const t = useTranslations('GalleryPage');
    const locale = useLocale();
    const tError = useApiErrorMessage();
    const [activePart, setActivePart] = useState<number | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const archiveQuery = useMemberArchive(eventId, open);
    const { refetch } = archiveQuery;
    const archive = archiveQuery.data;

    const downloadPart = useCallback(
        async (part: number) => {
            setDownloadError(null);
            setActivePart(part);
            try {
                // The links on screen may have expired, or the archive may have been withdrawn since.
                const refreshed = await refetch();
                if (refreshed.error) {
                    setDownloadError(tError(refreshed.error, t('archiveDownloadFailed')));
                    return;
                }
                const fresh = refreshed.data?.status === 'READY' ? refreshed.data.parts.find((entry) => entry.part === part) : undefined;
                if (!fresh) {
                    setDownloadError(t('memberArchiveChanged'));
                    return;
                }
                if (!isHttpsUrl(fresh.url)) {
                    setDownloadError(t('archiveDownloadFailed'));
                    return;
                }
                assignLocation(fresh.url);
            } finally {
                setActivePart(null);
            }
        },
        [refetch, t, tError],
    );

    const handleCheckAgain = useCallback(() => {
        void refetch();
    }, [refetch]);

    const handlePartClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const part = Number(event.currentTarget.dataset.part);
            if (!Number.isFinite(part)) return;
            void downloadPart(part);
        },
        [downloadPart],
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
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <div className="pr-8">
                    <p className="text-lg font-bold text-ink">{t('downloadGalleryTitle')}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('memberArchiveSubtitle')}</p>
                </div>

                <div className="mt-5">
                    {archiveQuery.isLoading ? (
                        <div className="py-6 text-center text-sm text-ink-muted">{t('archiveLoading')}</div>
                    ) : archiveQuery.isError && !archive ? (
                        // Only when there is nothing to show: a failed click-refetch keeps the list and
                        // reports through downloadError below.
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {tError(archiveQuery.error, t('archiveManifestFailed'))}
                        </div>
                    ) : archive?.status === 'READY' && archive.parts.length === 0 ? (
                        <div className="py-6 text-center text-sm text-ink-muted">{t('memberArchiveEmpty')}</div>
                    ) : archive?.status === 'NOT_YET' && archive.availableFrom ? (
                        <p className="py-6 text-center text-sm text-ink-muted">
                            {t('memberArchiveNotYet', {
                                date: dateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(archive.availableFrom)),
                            })}
                        </p>
                    ) : archive?.status === 'PREPARING' ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <p className="text-sm text-ink-muted">{t('memberArchivePreparing')}</p>
                            <Button type="button" size="sm" variant="outline" onClick={handleCheckAgain} disabled={archiveQuery.isFetching}>
                                {archiveQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {t('memberArchiveCheckAgain')}
                            </Button>
                        </div>
                    ) : archive?.status !== 'READY' ? (
                        // UNAVAILABLE, no data, NOT_YET without a date, or a status this build does not know.
                        <p className="py-6 text-center text-sm text-ink-muted">{t('memberArchiveUnavailable')}</p>
                    ) : (
                        <div className="max-h-[46vh] overflow-y-auto rounded-2xl border border-border/70 bg-background">
                            {archive.parts.map((part) => {
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
                                                {t('archivePartLabel', { part: part.part, total: part.totalParts })}
                                            </p>
                                            <p className="mt-1 text-xs text-ink-muted">{formatBytes(part.bytes)}</p>
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
                    {downloadError && <p className="mt-3 text-xs leading-relaxed text-rose-600">{downloadError}</p>}
                </div>
            </Modal.Body>
        </Modal>
    );
}
