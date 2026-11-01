'use client';

import { ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistLiveLinks } from '@/components/playlist/live/PlaylistLiveLinks';
import { PlaylistLivePlayedButton } from '@/components/playlist/live/PlaylistLivePlayedButton';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// One song still to play: its place in the queue, what it is, who wants it, where to find it, and the played mark.
export function PlaylistLiveCard({
    row,
    position,
    canMark,
    isPending,
    onToggleAction,
}: {
    row: PlaylistSuggestionLeaderboardDto;
    position: number;
    canMark: boolean;
    isPending: boolean;
    onToggleAction: (row: PlaylistSuggestionLeaderboardDto) => void;
}) {
    const t = useTranslations('Vendors');
    const next = position === 1;

    return (
        <li className={cn('rounded-[1.5rem] bg-card p-4 shadow-xs ring-1 sm:p-5', next ? 'ring-primary/40' : 'ring-ink/5')}>
            <div className="flex items-start gap-3.5">
                {/* Position */}
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                        next ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-ink-muted',
                    )}
                >
                    {position}
                </span>

                {/* Song */}
                <div className="min-w-0 flex-1">
                    <p className="text-base leading-snug font-semibold text-ink">{row.title}</p>
                    {row.artist && <p className="mt-0.5 text-sm text-ink-muted">{row.artist}</p>}
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted tabular-nums">
                        <ThumbsUp className="size-3.5" aria-hidden="true" />
                        {t('live.votes', { count: row.upvoteCount })}
                    </p>
                </div>

                {/* Played */}
                {canMark && <PlaylistLivePlayedButton row={row} isPending={isPending} onToggleAction={onToggleAction} />}
            </div>

            {/* Note */}
            {row.comment && <p className="mt-3 rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm leading-snug text-ink">{row.comment}</p>}

            {/* Links */}
            <PlaylistLiveLinks spotifyUrl={row.spotifyUrl} youtubeUrl={row.youtubeUrl} className="mt-3" />
        </li>
    );
}
