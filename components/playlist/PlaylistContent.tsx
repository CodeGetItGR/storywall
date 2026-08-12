'use client';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PlaylistItemRow, PlaylistLeaderboard } from '@/components/playlist';
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
            <div className="mb-5 flex items-center justify-between gap-3 py-4">
                <Link
                    href={routes.post.feed(eventId)}
                    aria-label={t('backToFeed')}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>

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
                <div className="py-8 text-sm text-ink-muted">{t('playlistEmpty')}</div>
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
