'use client';

import { ArrowUp, Music, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { PlaylistItemRow, PlaylistLeaderboardSheet } from '@/components/playlist';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import type { PlaylistSuggestionLeaderboardDto, PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

interface PlaylistContentProps {
    canSuggest: boolean;
    eventId: string;
    isEventWritable: boolean;
    isHost: boolean;
    isLoadingLeaderboard: boolean;
    leaderboard: PlaylistSuggestionLeaderboardDto[];
    onSuggest: () => void;
    suggestions: PlaylistSuggestionResponseDto[];
    suggestionsLoading: boolean;
    showTitleIcon?: boolean;
}

export function PlaylistContent({
    canSuggest,
    eventId,
    isEventWritable,
    isHost,
    isLoadingLeaderboard,
    leaderboard,
    onSuggest,
    suggestions,
    suggestionsLoading,
    showTitleIcon = false,
}: PlaylistContentProps) {
    const t = useTranslations('PlaylistPage');
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const leader = leaderboard[0];

    const handleLeaderboardOpen = useCallback(() => {
        setIsLeaderboardOpen(true);
    }, []);

    const handleLeaderboardClose = useCallback(() => {
        setIsLeaderboardOpen(false);
    }, []);

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={t('title')}
            icon={Music}
            iconClassName="text-violet-500"
            showTitleIcon={showTitleIcon}
            backLabel={t('backToFeed')}
            backHref={routes.post.feed(eventId)}
            action={
                suggestions.length > 0 ? (
                    <button
                        type="button"
                        onClick={onSuggest}
                        disabled={!canSuggest}
                        aria-label={t('suggestASong')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
                    >
                        <Plus className="h-4 w-4" />
                        {t('suggest')}
                    </button>
                ) : undefined
            }
        >
            {/* Status */}
            {!isEventWritable && <p className="mb-5 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('readOnly')}</p>}

            {/* Leaderboard */}
            {isHost && (
                <button
                    type="button"
                    onClick={handleLeaderboardOpen}
                    disabled={isLoadingLeaderboard}
                    className="mb-5 flex w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-card px-4 py-2.5 text-left shadow-sm shadow-black/5 transition-colors hover:bg-surface-muted/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <ArrowUp className="h-4 w-4 shrink-0 text-ink-faint" />
                        <span className="truncate text-sm font-medium text-ink">
                            {leader ? t('leaderboardTriggerLeader', { title: leader.title }) : t('leaderboardEmpty')}
                        </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {t('leaderboardTrigger')}
                    </span>
                </button>
            )}

            {/* Content */}
            {suggestionsLoading ? (
                <div className="py-8 text-sm text-ink-muted">{t('loadingSongs')}</div>
            ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-5 py-8 text-center text-sm text-ink-muted">
                    <Music className="h-10 w-auto" />
                    <p>{t('playlistEmpty')}</p>
                    <button
                        type="button"
                        onClick={onSuggest}
                        disabled={!canSuggest}
                        aria-label={t('suggestASong')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
                    >
                        <Plus className="h-4 w-4" />
                        {t('suggest')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {suggestions.map((suggestion) => (
                        <PlaylistItemRow key={suggestion.id} suggestion={suggestion} />
                    ))}
                </div>
            )}

            {isHost && (
                <PlaylistLeaderboardSheet
                    open={isLeaderboardOpen}
                    onClose={handleLeaderboardClose}
                    leaderboard={leaderboard}
                    isLoading={isLoadingLeaderboard}
                />
            )}
        </ModulePageShell>
    );
}
