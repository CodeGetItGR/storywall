'use client';

import { Check, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Marks a song played, or takes the mark back once it is. Labelled, so the DJ knows what a tap does.
export function PlaylistLivePlayedButton({
    row,
    isPending,
    onToggleAction,
}: {
    row: PlaylistSuggestionLeaderboardDto;
    isPending: boolean;
    onToggleAction: (row: PlaylistSuggestionLeaderboardDto) => void;
}) {
    const t = useTranslations('Vendors');
    const played = Boolean(row.playedAt);
    const handleToggle = useCallback(() => onToggleAction(row), [onToggleAction, row]);
    const Icon = played ? Undo2 : Check;

    return (
        <button
            type="button"
            aria-pressed={played}
            aria-label={played ? t('live.markUnplayed', { title: row.title }) : t('live.markPlayed', { title: row.title })}
            disabled={isPending}
            onClick={handleToggle}
            className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold focus-ring transition-colors disabled:opacity-50',
                played ? 'text-ink-muted hover:bg-surface-muted' : 'bg-ink text-white hover:bg-ink/90',
            )}
        >
            <Icon className="size-4" aria-hidden="true" />
            {played ? t('live.undo') : t('live.played')}
        </button>
    );
}
