'use client';

import { Mic, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import { WishbookEntriesSkeleton } from '@/components/wishbook/WishbookSkeletons';
import type { WishbookEntryResponseDto } from '@/lib/api/types';
import { dateTimeFormat } from '@/lib/format';
import { formatClipDuration } from '@/lib/wishbook/voice';

type Props = {
    entries: WishbookEntryResponseDto[];
    isLoading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    // False once the event stops taking writes: the rows stay, read-only.
    canEdit: boolean;
    onSelect: (entry: WishbookEntryResponseDto) => void;
};

// The wishes the signed-in guest wrote themselves. Nobody else's are ever shown to a guest.
export function MyWishesSection({ entries, isLoading, hasNextPage, isFetchingNextPage, onLoadMore, canEdit, onSelect }: Props) {
    const t = useTranslations('WishbookPage');

    function selectEntry(event: MouseEvent<HTMLButtonElement>) {
        const entry = entries.find((item) => item.id === event.currentTarget.dataset.entryId);
        if (entry) onSelect(entry);
    }

    if (!isLoading && entries.length === 0) return null;

    return (
        <section className="mt-8" aria-labelledby="my-wishes-title">
            {/* Header */}
            <h2 id="my-wishes-title" className="mb-3 text-sm font-semibold text-ink">
                {t('myWishesTitle')}
            </h2>

            {/* Rows */}
            {isLoading ? (
                <WishbookEntriesSkeleton />
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            {canEdit ? (
                                <button
                                    type="button"
                                    data-entry-id={entry.id}
                                    onClick={selectEntry}
                                    className="flex min-h-14 w-full items-start gap-3 rounded-[1.5rem] bg-surface-muted/70 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                                >
                                    <MyWishRowText entry={entry} playable={false} />
                                    <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                                    <span className="sr-only">{t('edit')}</span>
                                </button>
                            ) : (
                                <div className="flex w-full items-start gap-3 rounded-[1.5rem] bg-surface-muted/70 px-4 py-3">
                                    <MyWishRowText entry={entry} playable />
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Footer */}
            {hasNextPage && (
                <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isFetchingNextPage}
                    className="mt-4 min-h-11 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                >
                    {isFetchingNextPage ? t('loading') : t('loadMore')}
                </button>
            )}
        </section>
    );
}

// An editable row is one button, so it can't hold a player: it shows the recording's length and the
// edit sheet plays it. A read-only row plays it in place.
function MyWishRowText({ entry, playable }: { entry: WishbookEntryResponseDto; playable: boolean }) {
    // Inside a button only phrasing content is allowed; the player is a block.
    const Box = playable ? 'div' : 'span';
    return (
        <Box className="block min-w-0 flex-1">
            {/* Message */}
            {entry.message ? (
                <span className="line-clamp-2 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</span>
            ) : null}

            {/* Recording */}
            {entry.audio && playable ? (
                <div className="mt-1">
                    <VoiceWishPlayer src={entry.audio.url} durationMs={entry.audio.durationMs} />
                </div>
            ) : null}
            {entry.audio && !playable ? (
                <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted tabular-nums">
                    <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                    {formatClipDuration(entry.audio.durationMs)}
                </span>
            ) : null}

            {/* Date */}
            <time dateTime={entry.createdAt} className="mt-1 block text-xs text-ink-faint">
                {dateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
            </time>
        </Box>
    );
}
