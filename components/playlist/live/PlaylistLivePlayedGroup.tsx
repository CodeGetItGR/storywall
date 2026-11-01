'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistLiveLinks } from '@/components/playlist/live/PlaylistLiveLinks';
import { PlaylistLivePlayedButton } from '@/components/playlist/live/PlaylistLivePlayedButton';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// The songs already played, folded away under the queue so they don't push what's next down the screen.
export function PlaylistLivePlayedGroup({
    rows,
    open,
    canMark,
    pendingId,
    onToggleOpenAction,
    onToggleAction,
}: {
    rows: PlaylistSuggestionLeaderboardDto[];
    open: boolean;
    canMark: boolean;
    pendingId: string | null;
    onToggleOpenAction: () => void;
    onToggleAction: (row: PlaylistSuggestionLeaderboardDto) => void;
}) {
    const t = useTranslations('Vendors');

    return (
        <section aria-labelledby="playlist-live-played-title" className="rounded-[1.5rem] bg-surface-muted p-2">
            {/* Toggle */}
            <h2 id="playlist-live-played-title">
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="playlist-live-played-list"
                    onClick={onToggleOpenAction}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-ink focus-ring"
                >
                    {t('live.playedGroup', { count: rows.length })}
                    <ChevronDown className={cn('size-4 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
            </h2>

            {/* Songs */}
            {open && (
                <ul id="playlist-live-played-list" className="mt-1 flex flex-col gap-1.5">
                    {rows.map((row) => (
                        <li key={row.id} className="rounded-2xl bg-card px-3.5 py-3">
                            <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-ink-muted line-through">{row.title}</p>
                                    {row.artist && <p className="truncate text-xs text-ink-muted">{row.artist}</p>}
                                </div>
                                {canMark && <PlaylistLivePlayedButton row={row} isPending={pendingId === row.id} onToggleAction={onToggleAction} />}
                            </div>
                            <PlaylistLiveLinks spotifyUrl={row.spotifyUrl} youtubeUrl={row.youtubeUrl} className="mt-2" />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
