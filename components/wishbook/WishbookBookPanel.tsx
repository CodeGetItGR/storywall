'use client';

import { BookOpen, Download, Loader2, PenLine, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useFreshBookDownloadUrl, useRequestWishbookBook, useWishbookBook } from '@/hooks/useWishbookBook';
import { downloadUrl } from '@/lib/download';

import { WishbookBookTextsModal } from './WishbookBookTextsModal';

const secondaryButton =
    'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60';
const primaryButton =
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white bg-gradient-brand disabled:cursor-not-allowed disabled:opacity-60';

// Hosts only. canEditTexts is false on a deleted event: the book can still be built, but its text is frozen.
export function WishbookBookPanel({ eventId, canEditTexts }: { eventId: string; canEditTexts: boolean }) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();
    const book = useWishbookBook(eventId, true);
    const request = useRequestWishbookBook(eventId);
    const freshUrl = useFreshBookDownloadUrl(eventId);
    const [textsOpen, setTextsOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const status = book.data?.status ?? null;
    const building = status === 'QUEUED' || status === 'RUNNING' || request.isPending;
    // Nothing went wrong when a wish was removed since the book was made: it gets its own line and a plain "create" button.
    // Every other failure code means "try again" and shares one generic line.
    const contentChanged = status === 'FAILED' && book.data?.failureCode === 'CONTENT_CHANGED';

    function create() {
        request.mutate();
    }
    async function download() {
        setDownloadError(null);
        setDownloading(true);
        try {
            const url = await freshUrl();
            if (url) downloadUrl(url, '');
            else setDownloadError(t('book.downloadFailed'));
        } catch {
            setDownloadError(t('book.downloadFailed'));
        } finally {
            setDownloading(false);
        }
    }
    function openTexts() {
        setTextsOpen(true);
    }
    function closeTexts() {
        setTextsOpen(false);
    }

    if (book.isLoading) return null;

    return (
        <section className="mt-8 rounded-[1.5rem] bg-amber-50/70 px-5 py-5">
            <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t('book.title')}</p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{t('book.body')}</p>

                    {/* Status */}
                    {building ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-ink-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            {t('book.building')}
                        </p>
                    ) : status === 'READY' && book.data ? (
                        <p className="mt-3 text-xs text-ink-muted">
                            {t('book.ready', { pages: book.data.pageCount ?? 0, wishes: book.data.entryCount ?? 0 })}
                        </p>
                    ) : status === 'FAILED' ? (
                        <p className="mt-3 text-xs text-rose-600">{contentChanged ? t('book.contentChanged') : t('book.failed')}</p>
                    ) : null}

                    {/* Actions */}
                    {!building && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {status === 'READY' ? (
                                <>
                                    <button type="button" onClick={download} disabled={downloading} className={primaryButton}>
                                        {downloading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Download className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        {t('book.download')}
                                    </button>
                                    <button type="button" onClick={create} className={secondaryButton}>
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('book.rebuild')}
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={create} className={primaryButton}>
                                    {status === 'FAILED' && !contentChanged ? t('book.retry') : t('book.create')}
                                </button>
                            )}
                            {canEditTexts && (
                                <button type="button" onClick={openTexts} className={secondaryButton}>
                                    <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('book.editTexts')}
                                </button>
                            )}
                        </div>
                    )}
                    {request.error && <p className="mt-2 text-xs text-rose-600">{toErrorMessage(request.error)}</p>}
                    {downloadError && <p className="mt-2 text-xs text-rose-600">{downloadError}</p>}
                </div>
            </div>
            {canEditTexts && textsOpen && <WishbookBookTextsModal eventId={eventId} onCloseAction={closeTexts} />}
        </section>
    );
}
