'use client';

import { BookHeart, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { LiteHomeHeader } from '@/components/liteHome/LiteHomeHeader';
import { ReportTargetModal } from '@/components/reports/ReportTargetModal';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { MyWishesSection } from '@/components/wishbook/MyWishesSection';
import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import { WISHBOOK_BOOK_ID, WishbookBookPanel } from '@/components/wishbook/WishbookBookPanel';
import { WishbookEntriesSkeleton } from '@/components/wishbook/WishbookSkeletons';
import { WishComposer } from '@/components/wishbook/WishComposer';
import { WishEditSheet } from '@/components/wishbook/WishEditSheet';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useContentAccess } from '@/hooks/useContentAccess';
import { useLiteHome } from '@/hooks/useLiteHome';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { useMyWishesList } from '@/hooks/useMyWishesList';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { useScrollToElement } from '@/hooks/useScrollToElement';
import { useDeleteWishbookEntry, useWishbook } from '@/hooks/useWishbook';
import { useSetWishHighlighted, useWishbookBook } from '@/hooks/useWishbookBook';
import { useWishComposer } from '@/hooks/useWishComposer';
import { useWishEditor } from '@/hooks/useWishEditor';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { canReportContent } from '@/lib/contentPermissions';
import { formatDate } from '@/lib/datetime';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { dateTimeFormat } from '@/lib/format';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember, useContentAccessMode, useIsHost } from '@/providers/EventProvider';

export default function WishbookPage() {
    const t = useTranslations('WishbookPage');
    const tAlt = useTranslations('ImageAlt');
    const event = useActiveEvent();
    const member = useActiveMember();
    const isHost = useIsHost();
    const contentAccess = useContentAccess();
    // The public demo runs on a local mock backend: there is no renderer there to build a book.
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    const locale = useLocale();
    const isDeleted = isEventDeleted(event);
    const deletionDate = event?.deletionScheduledFor ? formatDate(locale, event.deletionScheduledFor, { dateStyle: 'long' }) : null;
    const { data: appConfig } = useAppConfig();
    const eventId = event?.id ?? '';
    // Only hosts and co-hosts read everyone's wishes; a signed-in guest reads their own.
    const wishbook = useWishbook(isHost ? (event?.id ?? null) : null);
    const myWishes = useMyWishesList(!isHost && member ? (event?.id ?? null) : null);
    const wishEditor = useWishEditor(eventId);
    const canEditOwn = event?.status === 'ACTIVE' && !isDeleted;
    const wishbookReadable = useModuleReadable(event?.id ?? null, 'wishbook');
    const upgradeHref = usePlanUpgradeHref(eventId);
    const deleteEntry = useDeleteWishbookEntry(eventId);
    const setHighlighted = useSetWishHighlighted(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [deleteTarget, setDeleteTarget] = useState<WishbookEntryResponseDto | null>(null);
    const [reportEntryId, setReportEntryId] = useState<string | null>(null);
    const entries = wishbook.data?.pages.flatMap((page) => page.content) ?? [];
    const total = wishbook.data?.pages[0]?.page.totalElements ?? 0;
    // Hosts read the wishbook; only an admin building a demo writes wishes as a host.
    const canWrite = event?.status === 'ACTIVE' && (!isHost || contentAccess.isDemoBuilder);
    const reportable = Boolean(appConfig?.reportTargetTypes?.includes('WISHBOOK_ENTRY'));
    const reportEntry = reportEntryId ? (entries.find((item) => item.id === reportEntryId) ?? null) : null;
    const wishbookCopy = useModuleCopy(event?.eventType)('wishbook');
    const title = wishbookCopy.name;
    const subtitle = wishbookCopy.description;
    const maxMessageLength = appConfig?.contentLimits.wishbookMessageMaxLength ?? 2000;
    // A demo builder's wish is signed by whoever they post as, which the backend fills in.
    const composer = useWishComposer({
        eventId,
        guestName: contentAccess.isDemoBuilder ? undefined : (member?.displayName ?? undefined),
        maxMessageLength,
    });
    const showEmptyState = isHost && !wishbook.isLoading && !wishbook.error && entries.length === 0;
    const showHeaderArt = canWrite || !showEmptyState;
    // The demo hands out the real event's own book, so the panel only belongs there while that event
    // has one: a visitor has nothing to build.
    const demoBook = useWishbookBook(eventId, isDemoVisitor && isHost);
    const showBookPanel = isHost && total > 0 && (!isDemoVisitor || Boolean(demoBook.data));
    const scrollToBook = useScrollToElement(WISHBOOK_BOOK_ID);
    // On a lite event this page is the home; its Download all scrolls to the book once there is one.
    const liteHome = useLiteHome('wishbook', { onDownload: showBookPanel ? scrollToBook : undefined });

    async function confirmDelete() {
        if (!deleteTarget) return;
        await deleteEntry.mutateAsync(deleteTarget.id);
        setDeleteTarget(null);
    }
    function selectDeleteTarget(event_: React.MouseEvent<HTMLButtonElement>) {
        const entry = entries.find((item) => item.id === event_.currentTarget.dataset.entryId);
        if (entry) setDeleteTarget(entry);
    }
    function canReportEntry(entry: WishbookEntryResponseDto) {
        return canReportContent({
            isMember: Boolean(member),
            isAuthor: Boolean(member && entry.authorMemberId === member.id),
            targetTypeReportable: reportable,
        });
    }
    function selectReportTarget(event_: React.MouseEvent<HTMLButtonElement>) {
        setReportEntryId(event_.currentTarget.dataset.entryId ?? null);
    }
    function closeReport() {
        setReportEntryId(null);
    }
    function closeDelete() {
        setDeleteTarget(null);
    }
    function loadMore() {
        void wishbook.fetchNextPage();
    }
    function toggleStar(event_: React.MouseEvent<HTMLButtonElement>) {
        const entry = entries.find((item) => item.id === event_.currentTarget.dataset.entryId);
        if (entry) setHighlighted.mutate({ entryId: entry.id, highlighted: !entry.highlighted });
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
            {...(liteHome.isHome
                ? { header: <LiteHomeHeader home={liteHome} /> }
                : { backLabel: t('goBack'), backHref: isDeleted ? routes.events.manage(eventId) : routes.events.feed(eventId) })}
            subtitle={liteHome.isHome ? undefined : subtitle}
            notice={
                isDeleted && deletionDate ? <ModuleNotice tone="warning">{t('deletedReadOnly', { date: deletionDate })}</ModuleNotice> : undefined
            }
        >
            {/* Header art */}
            {showHeaderArt ? (
                <section className="flex flex-col items-center px-2 pt-8 text-center">
                    <Image src="/icons/wishbook.svg" alt={tAlt('wishbook')} width={104} height={104} preload className="h-24 w-24" unoptimized />
                </section>
            ) : null}

            {/* Composer */}
            {canWrite ? <WishComposer composer={composer} maxMessageLength={maxMessageLength} /> : null}

            {/* Your messages */}
            {!isHost && <MyWishesSection {...myWishes} canEdit={canEditOwn} onSelect={wishEditor.open} />}

            {/* Keepsake book */}
            {/* The demo builds and downloads a sample book; its texts are the backend's, so they stay fixed there. */}
            {showBookPanel && <WishbookBookPanel eventId={eventId} canEditTexts={!isDeleted && !isDemoVisitor} />}

            {/* Entries */}
            {isHost && (
                <section className="mt-8">
                    {!wishbook.isLoading && !wishbook.error && (
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-ink-faint">{entries.length > 0 ? t('messageCount', { count: total }) : null}</p>
                        </div>
                    )}
                    {wishbook.isLoading && <WishbookEntriesSkeleton />}
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
                                            {dateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                                        </time>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {/* Only hosts get a boolean here (everyone else, and demo wishes, get null or nothing). */}
                                        {typeof entry.highlighted === 'boolean' && !isDeleted && (
                                            <button
                                                type="button"
                                                data-entry-id={entry.id}
                                                onClick={toggleStar}
                                                aria-label={t('star')}
                                                aria-pressed={entry.highlighted}
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-amber-50 hover:text-amber-600"
                                            >
                                                <Star
                                                    className={entry.highlighted ? 'h-4 w-4 fill-amber-400 text-amber-500' : 'h-4 w-4'}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        )}
                                        {canReportEntry(entry) && (
                                            <button
                                                type="button"
                                                data-entry-id={entry.id}
                                                onClick={selectReportTarget}
                                                className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-ink-faint hover:bg-surface-muted hover:text-ink"
                                            >
                                                {t('reportEntry')}
                                            </button>
                                        )}
                                        {entry.canDelete && !isDeleted && !contentAccess.isLocked(entry.id) && (
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
                                </div>
                                {/* Message */}
                                {entry.message ? (
                                    <p className="mt-3 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</p>
                                ) : null}
                                {/* Recording */}
                                {entry.audio ? (
                                    <div className="mt-3">
                                        <VoiceWishPlayer src={entry.audio.url} durationMs={entry.audio.durationMs} />
                                    </div>
                                ) : null}
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
            )}

            {reportEntry && (
                <ReportTargetModal eventId={eventId} targetType="WISHBOOK_ENTRY" targetId={reportEntry.id} open onCloseAction={closeReport} />
            )}

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

            {/* Edit own wish */}
            <WishEditSheet editor={wishEditor} maxLength={maxMessageLength} />
        </ModulePageShell>
    );
}
