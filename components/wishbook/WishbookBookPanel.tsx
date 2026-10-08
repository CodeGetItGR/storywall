'use client';

import { BookOpen, Download, Loader2, PenLine, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useFreshBook, useRequestWishbookBook, useWishbookBook } from '@/hooks/useWishbookBook';

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
    const freshBook = useFreshBook(eventId);
    const [textsOpen, setTextsOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);
    // The build the failed download belonged to. The message only shows while that build is still the one on screen,
    // so it goes away by itself when the status moves on.
    const [downloadErrorFor, setDownloadErrorFor] = useState<string | null>(null);

    const status = book.data?.status ?? null;
    const buildKey = `${status}|${book.data?.requestedAt}`;
    const downloadError = downloadErrorFor === buildKey;
    // A failed read stops the polling, so a cached QUEUED/RUNNING no longer means "building": show the error instead.
    const readFailed = book.isError;
    const building = !readFailed && (status === 'QUEUED' || status === 'RUNNING' || request.isPending);
    // Nothing went wrong when a wish was removed since the book was made: it gets its own line and a plain "create" button.
    // Every other failure code means "try again" and shares one generic line.
    const contentChanged = status === 'FAILED' && book.data?.failureCode === 'CONTENT_CHANGED';

    function create() {
        request.mutate();
    }
    async function download() {
        setDownloadErrorFor(null);
        setDownloading(true);
        try {
            const fresh = await freshBook();
            // Navigate rather than click a created anchor: the latter is blocked on mobile Safari after an await.
            if (fresh.status === 'READY' && fresh.downloadUrl) window.location.assign(fresh.downloadUrl);
            // Any other status is already on screen through the cache (a rebuild started, or the book was taken down).
            else if (fresh.status === 'READY') setDownloadErrorFor(buildKey);
        } catch {
            setDownloadErrorFor(buildKey);
        } finally {
            setDownloading(false);
        }
    }
    function refetchBook() {
        void book.refetch();
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
                    <div role="status" aria-live="polite">
                        {readFailed ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <p className="text-xs text-rose-600">{toErrorMessage(book.error)}</p>
                                <button type="button" onClick={refetchBook} disabled={book.isFetching} className={secondaryButton}>
                                    {t('book.retry')}
                                </button>
                            </div>
                        ) : building ? (
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
                    </div>

                    {/* Actions */}
                    {!building && !readFailed && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {status === 'READY' ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={download}
                                        disabled={downloading || request.isPending}
                                        aria-busy={downloading}
                                        className={primaryButton}
                                    >
                                        {downloading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Download className="h-4 w-4" aria-hidden="true" />
                                        )}
                                        {t('book.download')}
                                    </button>
                                    <button type="button" onClick={create} disabled={downloading} className={secondaryButton}>
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('book.rebuild')}
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={create} disabled={downloading} className={primaryButton}>
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
                    {request.error && (
                        <p role="alert" className="mt-2 text-xs text-rose-600">
                            {toErrorMessage(request.error)}
                        </p>
                    )}
                    {downloadError && (
                        <p role="alert" className="mt-2 text-xs text-rose-600">
                            {t('book.downloadFailed')}
                        </p>
                    )}
                </div>
            </div>
            {canEditTexts && textsOpen && <WishbookBookTextsModal eventId={eventId} onCloseAction={closeTexts} />}
        </section>
    );
}
