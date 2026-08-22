'use client';

import { BookHeart, Loader2, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCreateWishbookEntry, useDeleteWishbookEntry, useWishbook } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

export default function WishbookPage() {
    const t = useTranslations('WishbookPage');
    const router = useRouter();
    const event = useActiveEvent();
    const member = useActiveMember();
    const isHost = useIsHost();
    const { data: appConfig } = useAppConfig();
    const eventId = event?.id ?? '';
    const wishbook = useWishbook(event?.id ?? null);
    const createEntry = useCreateWishbookEntry(eventId);
    const deleteEntry = useDeleteWishbookEntry(eventId);
    const toErrorMessage = useApiErrorMessage();
    const [message, setMessage] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<WishbookEntryResponseDto | null>(null);
    const entries = wishbook.data?.pages.flatMap((page) => page.content) ?? [];
    const total = wishbook.data?.pages[0]?.totalElements ?? 0;
    const canWrite = event?.status === 'ACTIVE' && !isHost;
    const wishbookModule = appConfig?.modules.find((module) => module.moduleKey === 'wishbook');
    const title = wishbookModule?.name ?? t('title');
    const subtitle = wishbookModule?.description ?? undefined;
    const memberName = member?.displayName ?? '';

    async function submit(event_: React.SubmitEvent<HTMLFormElement>) {
        event_.preventDefault();
        const trimmed = message.trim();
        if (!trimmed) return;
        await createEntry.mutateAsync({ message: trimmed, guestName: member?.displayName ?? undefined });
        setMessage('');
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        await deleteEntry.mutateAsync(deleteTarget.id);
        setDeleteTarget(null);
    }
    function goBack() {
        router.back();
    }
    function changeMessage(event_: React.ChangeEvent<HTMLTextAreaElement>) {
        setMessage(event_.target.value);
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

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={title}
            icon={BookHeart}
            iconClassName="text-pink-500"
            showTitleIcon={false}
            backLabel={t('goBack')}
            onBack={goBack}
            subtitle={subtitle}
        >
            {/* Header art */}
            <section className="flex flex-col items-center px-2 pt-8 text-center">
                <Image src="/icons/wishbook.svg" alt="" width={104} height={104} priority className="h-24 w-24" />
            </section>

            {/* Composer */}
            {canWrite ? (
                <form onSubmit={submit} className="mt-8 space-y-4">
                    {memberName && <p className="truncate text-lg font-semibold text-ink">{memberName}</p>}
                    <textarea
                        id="wishbook-message"
                        maxLength={2000}
                        rows={8}
                        value={message}
                        onChange={changeMessage}
                        aria-label={t('messageAriaLabel')}
                        className="min-h-56 w-full resize-none rounded-[1.5rem] border border-border/70 bg-background px-5 py-4 text-base leading-8 text-ink outline-none transition-shadow focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-ink-faint">{t('charactersLeft', { count: 2000 - message.length })}</span>
                        <button
                            type="submit"
                            disabled={!message.trim() || createEntry.isPending}
                            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-brand px-4 text-sm font-semibold text-white disabled:opacity-40"
                        >
                            {createEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {t('addToWishbook')}
                        </button>
                    </div>
                    {createEntry.error && <p className="text-xs text-rose-600">{toErrorMessage(createEntry.error)}</p>}
                </form>
            ) : null}

            {/* Entries */}
            <section className="mt-8">
                {wishbook.isLoading && <p className="py-10 text-center text-sm text-ink-muted">{t('loading')}</p>}
                {wishbook.error && <p className="py-10 text-center text-sm text-rose-600">{toErrorMessage(wishbook.error)}</p>}
                {!wishbook.isLoading && !wishbook.error && entries.length === 0 && (
                    <p className="py-10 text-center text-sm text-ink-muted">{canWrite ? t('empty') : t('emptyReadOnly')}</p>
                )}
                {!wishbook.isLoading && !wishbook.error && entries.length > 0 && (
                    <p className="mb-3 text-xs text-ink-faint">{t('messageCount', { count: total })}</p>
                )}
                <div className="space-y-3">
                    {entries.map((entry) => (
                        <article key={entry.id} className="rounded-[1.5rem] bg-surface-muted/70 px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink">{entry.guestName}</p>
                                    <time className="text-xs text-ink-faint">
                                        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
                                            new Date(entry.createdAt)
                                        )}
                                    </time>
                                </div>
                                {entry.canDelete && (
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
                            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{entry.message}</p>
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
                onClose={closeDelete}
                onConfirm={confirmDelete}
                title={t('deleteTitle')}
                body={t('deleteBody')}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                isConfirming={deleteEntry.isPending}
            />
        </ModulePageShell>
    );
}
