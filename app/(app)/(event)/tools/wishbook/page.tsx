'use client';

import { BookHeart, Loader2, Send, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreateWishbookEntry, useDeleteWishbookEntry, useWishbook } from '@/hooks/useWishbook';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

export default function WishbookPage() {
    const t = useTranslations('WishbookPage');
    const router = useRouter();
    const event = useActiveEvent();
    const member = useActiveMember();
    const isHost = useIsHost();
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
        <ModulePageShell title={t('title')} icon={BookHeart} iconClassName="text-pink-500" backLabel={t('goBack')} onBack={goBack} subtitle={t('subtitle')}>
            {canWrite ? (
                <form onSubmit={submit} className="mb-6 border-b border-border pb-5">
                    <label className="text-sm font-semibold text-ink" htmlFor="wishbook-message">
                        {t('messageAriaLabel')}
                    </label>
                    <textarea
                        id="wishbook-message"
                        maxLength={2000}
                        rows={4}
                        value={message}
                        onChange={changeMessage}
                        placeholder={t('currentPlaceholder')}
                        className="mt-2 w-full resize-none rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
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
                    {createEntry.error && <p className="mt-2 text-xs text-rose-600">{toErrorMessage(createEntry.error)}</p>}
                </form>
            ) : (
                <ModuleNotice tone={event?.status === 'FROZEN' ? 'info' : 'muted'}>
                    {isHost ? t('hostReadOnly') : event?.status === 'FROZEN' ? t('frozenReadOnly') : t('draftReadOnly')}
                </ModuleNotice>
            )}

            {wishbook.isLoading && <p className="py-10 text-center text-sm text-ink-muted">{t('loading')}</p>}
            {wishbook.error && <p className="py-10 text-center text-sm text-rose-600">{toErrorMessage(wishbook.error)}</p>}
            {!wishbook.isLoading && !wishbook.error && entries.length === 0 && (
                <p className="py-10 text-center text-sm text-ink-muted">{t('empty')}</p>
            )}
            {!wishbook.isLoading && !wishbook.error && entries.length > 0 && (
                <p className="mb-2 text-xs text-ink-faint">{t('messageCount', { count: total })}</p>
            )}
            <div className="divide-y divide-border">
                {entries.map((entry) => (
                    <article key={entry.id} className="py-4 first:pt-0">
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
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{entry.message}</p>
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
