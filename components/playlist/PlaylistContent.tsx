'use client';

import { Music, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistItemRow, PlaylistLeaderboard } from '@/components/playlist';
import { ModulePageHeader } from '@/components/tools/ModulePageHeader';
import type { PlaylistSuggestionLeaderboardDto, PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

const HOST_LEADERBOARD_VISIBLE_SONGS = 3;

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
}: PlaylistContentProps) {
    const t = useTranslations('PlaylistPage');

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <ModulePageHeader
                title={t('title')}
                icon={Music}
                iconClassName="text-violet-500"
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
            />
            {!isEventWritable && <p className="mb-5 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('readOnly')}</p>}

            {isHost && (
                <section className="mb-8">
                    <PlaylistLeaderboard
                        leaderboard={leaderboard}
                        isLoading={isLoadingLeaderboard}
                        maxVisibleSongs={HOST_LEADERBOARD_VISIBLE_SONGS}
                    />
                </section>
            )}

            {suggestionsLoading ? (
                <div className="py-8 text-sm text-ink-muted">{t('loadingSongs')}</div>
            ) : suggestions.length === 0 ? (
                <div className="py-8 text-sm text-ink-muted flex flex-col text-center justify-center items-center gap-5">
                    <Music className="w-10 h-auto" />
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
        </div>
    );
}
