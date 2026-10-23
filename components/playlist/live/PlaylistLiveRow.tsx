'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function PlaylistLiveRow({
    row,
    canMark,
    isPending,
    onToggleAction,
}: {
    row: PlaylistSuggestionLeaderboardDto;
    canMark: boolean;
    isPending: boolean;
    onToggleAction: (row: PlaylistSuggestionLeaderboardDto) => void;
}) {
    const t = useTranslations('Vendors');
    const played = Boolean(row.playedAt);
    const handleToggle = useCallback(() => onToggleAction(row), [onToggleAction, row]);

    return (
        <li className="flex min-h-16 items-center gap-3 py-2.5">
            {/* Song (dimmed once played) */}
            <span className={cn('w-6 shrink-0 text-right text-sm font-bold text-ink-muted tabular-nums', played && 'opacity-50')}>{row.rank}</span>
            <div className={cn('min-w-0 flex-1', played && 'opacity-50')}>
                <p className={cn('truncate text-sm font-semibold text-ink', played && 'line-through')}>{row.title}</p>
                <p className="truncate text-xs text-ink-muted">
                    {[row.artist, t('live.votes', { count: row.upvoteCount })].filter(Boolean).join(' · ')}
                </p>
                {row.comment && <p className="line-clamp-2 text-xs text-ink-muted">{row.comment}</p>}
            </div>

            {/* Played */}
            {played && <span className="sr-only">{t('live.played')}</span>}
            {canMark ? (
                <button
                    type="button"
                    aria-pressed={played}
                    aria-label={played ? t('live.markUnplayed', { title: row.title }) : t('live.markPlayed', { title: row.title })}
                    disabled={isPending}
                    onClick={handleToggle}
                    className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-full border focus-ring disabled:opacity-50',
                        played ? 'border-ink bg-ink text-white' : 'border-border text-ink-muted',
                    )}
                >
                    <Check className="size-5" aria-hidden="true" />
                </button>
            ) : (
                played && <Check className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            )}
        </li>
    );
}
