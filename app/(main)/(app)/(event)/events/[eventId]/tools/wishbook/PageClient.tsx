'use client';

import { BookHeart, Download, Loader2, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useCreateWishbookEntry, useDeleteWishbookEntry, useWishbook, useWishbookExportDownload } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

export default function WishbookPage() {
    const t = useTranslations('WishbookPage');
    const event = useActiveEvent();
    const member = useActiveMember();
    const isHost = useIsHost();
    const locale = useLocale();
    const isDeleted = isEventDeleted(event);
    const deletionDate = event?.deletionScheduledFor ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'long' }) : null;
    const { data: appConfig } = useAppConfig();
    const eventId = event?.id ?? '';
    const wishbook = useWishbook(event?.id ?? null);
    const wishbookReadable = useModuleReadable(event?.id ?? null, 'wishbook');
    const upgradeHref = usePlanUpgradeHref(eventId);
    const createEntry = useCreateWishbookEntry(eventId);
    const deleteEntry = useDeleteWishbookEntry(eventId);
    const exportPdf = useWishbookExportDownload(eventId, t('exportFailed'));
    const toErrorMessage = useApiErrorMessage();
    const [message, setMessage] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<WishbookEntryResponseDto | null>(null);
    const [showSentConfirmation, setShowSentConfirmation] = useState(false);
    const entries = wishbook.data?.pages.flatMap((page) => page.content) ?? [];
    const total = wishbook.data?.pages[0]?.page.totalElements ?? 0;
    const canWrite = event?.status === 'ACTIVE' && !isHost;
    const wishbookModule = appConfig?.modules.find((module) => module.moduleKey === 'wishbook');
    const title = wishbookModule?.name ?? t('title');
    const subtitle = wishbookModule?.description ?? undefined;
    const maxMessageLength = appConfig?.contentLimits.wishbookMessageMaxLength ?? 2000;
    const showEmptyState = !wishbook.isLoading && !wishbook.error && entries.length === 0;
    const showHeaderArt = canWrite || !showEmptyState;

    useEffect(() => {
        if (!showSentConfirmation) return;
        const timeout = setTimeout(() => setShowSentConfirmation(false), 5000);
        return () => clearTimeout(timeout);
    }, [showSentConfirmation]);

    async function submit(event_: React.SubmitEvent<HTMLFormElement>) {
        event_.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) return;
        setShowSentConfirmation(false);
        await createEntry.mutateAsync({ message: trimmed, guestName: member?.displayName ?? undefined });
        setMessage('');
        setShowSentConfirmation(true);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        await deleteEntry.mutateAsync(deleteTarget.id);
        setDeleteTarget(null);
    }
    function changeMessage(event_: React.ChangeEvent<HTMLTextAreaElement>) {
        setMessage(event_.target.value.slice(0, maxMessageLength));
    }
    function selectDeleteTarget(event_: React.MouseEvent<HTMLButtonElement>) {
        const entry = entries.find((item) => item.id === event_.currentTarget.dataset.entryId);
        if (entry) setDeleteTarget(entry);
    }
    function closeDelete() {
        setDeleteTarget(null);
    }
    function loadMore() {
        void wishbook.fetchNextPage();
    }
    function handleExportPdf() {
        void exportPdf.download();
    }

    if (event && !wishbookReadable) {
        return (
            <ModuleUnavailableState
                backHref={routes.events.feed(eventId)}
                backLabel={t('goBack')}
                body={t('unavailableBody')}
                icon={BookHeart}
                iconClassName="text-pink-500"
                title={t('unavailableTitle')}
                upgradeHref={upgradeHref}
            />
        );
    }

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={title}
            icon={BookHeart}
            iconClassName="text-pink-500"
            showTitleIcon={false}
            backLabel={t('goBack')}
            backHref={isDeleted ? routes.events.manage(eventId) : routes.events.feed(eventId)}
            subtitle={subtitle}
            notice={
                isDeleted && deletionDate ? <ModuleNotice tone="warning">{t('deletedReadOnly', { date: deletionDate })}</ModuleNotice> : undefined
            }
        >
            {/* Header art */}
            {showHeaderArt ? (
                <section className="flex flex-col items-center px-2 pt-8 text-center">
                    <Image src="/icons/wishbook.svg" alt="" width={104} height={104} preload className="h-24 w-24" unoptimized />
                </section>
            ) : null}

            {/* Composer */}
            {canWrite && showSentConfirmation ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-[1.5rem] bg-pink-50 px-6 py-12 text-center">
                    <BookHeart className="h-9 w-9 text-pink-500" />
                    <p className="text-base font-semibold text-ink">{t('wishSentTitle')}</p>
                    <p className="max-w-xs text-sm leading-6 text-ink-muted">{t('wishSentBody')}</p>
                </div>
            ) : canWrite ? (
                <form onSubmit={submit} className="mt-8 space-y-4">
                    <textarea
                        id="wishbook-message"
                        maxLength={maxMessageLength}
                        rows={8}
                        value={message}
                        onChange={changeMessage}
                        disabled={createEntry.isPending}
                        aria-label={t('messageAriaLabel')}
                        placeholder={t('currentPlaceholder')}
                        className="min-h-56 w-full resize-none rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink transition-shadow outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    />
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-ink-faint">{t('charactersLeft', { current: message.length, max: maxMessageLength })}</span>
                        <button
                            type="submit"
                            disabled={!message.trim() || createEntry.isPending}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-40"
                        >
                            {createEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {t('addToWishbook')}
                        </button>
                    </div>
                    {createEntry.error && <p className="text-xs text-rose-600">{toErrorMessage(createEntry.error)}</p>}
                </form>
            ) : null}

            {/* Entries */}
            <section className="mt-8" hidden={!isHost}>
                {!wishbook.isLoading && !wishbook.error && (
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-ink-faint">{entries.length > 0 ? t('messageCount', { count: total }) : null}</p>
                        {entries.length > 0 && (
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={exportPdf.isDownloading}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {exportPdf.isDownloading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {t('exportPdf')}
                            </button>
                        )}
                    </div>
                )}
                {exportPdf.error && <p className="mb-3 text-xs text-rose-600">{exportPdf.error}</p>}
                {wishbook.isLoading && <LoadingState label={t('loading')} className="py-10" />}
                {wishbook.error && <p className="py-10 text-center text-sm text-rose-600">{toErrorMessage(wishbook.error)}</p>}
                {showEmptyState && (
                    <ToolEmptyState
                        title={t('emptyTitle')}
                        body={canWrite ? t('emptyBody') : undefined}
                        iconSrc="/icons/wishbook.svg"
                        iconFrame="plain"
                        iconAreaClassName="h-28 w-28"
                        previewIconClassName="h-6 w-6"
                    />
                )}
                <div className="space-y-3">
                    {entries.map((entry) => (
                        <article key={entry.id} className="rounded-[1.5rem] bg-surface-muted/70 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink">{entry.guestName}</p>
                                    <time className="text-xs text-ink-faint">
                                        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
                                            new Date(entry.createdAt),
                                        )}
                                    </time>
                                </div>
                                {entry.canDelete && !isDeleted && (
                                    <button
                                        type="button"
                                        data-entry-id={entry.id}
                                        onClick={selectDeleteTarget}
                                        aria-label={t('delete')}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-3 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</p>
                        </article>
                    ))}
                </div>
                {wishbook.hasNextPage && (
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={wishbook.isFetchingNextPage}
                        className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                    >
                        {wishbook.isFetchingNextPage ? t('loading') : t('loadMore')}
                    </button>
                )}
            </section>

            <ConfirmActionModal
                open={Boolean(deleteTarget)}
                onCloseAction={closeDelete}
                onConfirmAction={confirmDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                isConfirming={deleteEntry.isPending}
            />
        </ModulePageShell>
    );
}
