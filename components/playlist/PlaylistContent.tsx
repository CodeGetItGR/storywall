'use client';

import { Music, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistItemRow } from '@/components/playlist';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import type { PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { PLAYLIST_TOP_RANK_COUNT, shouldShowPlaylistTopRanks } from '@/lib/playlistRanking';
import { routes } from '@/lib/routes';

interface PlaylistContentProps {
    canSuggest: boolean;
    eventId: string;
    isEventWritable: boolean;
    onSuggest: () => void;
    suggestions: PlaylistSuggestionResponseDto[];
    suggestionsLoading: boolean;
    showTitleIcon?: boolean;
}

export function PlaylistContent({
    canSuggest,
    eventId,
    isEventWritable,
    onSuggest,
    suggestions,
    suggestionsLoading,
    showTitleIcon = false,
}: PlaylistContentProps) {
    const t = useTranslations('PlaylistPage');
    const showTopRanks = shouldShowPlaylistTopRanks(suggestions);

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={t('title')}
            icon={Music}
            iconClassName="text-violet-500"
            showTitleIcon={showTitleIcon}
            backLabel={t('backToFeed')}
            backHref={routes.events.feed(eventId)}
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

            {/* Content */}
            {suggestionsLoading ? (
                <LoadingState label={t('loadingSongs')} className="py-8" />
            ) : suggestions.length === 0 ? (
                <ToolEmptyState
                    title={t('emptyTitle')}
                    body={t('emptyBody')}
                    icon={Music}
                    action={
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
                    }
                />
            ) : (
                <div className="flex flex-col gap-2.5">
                    {suggestions.map((suggestion, index) => (
                        <PlaylistItemRow
                            key={suggestion.id}
                            suggestion={suggestion}
                            topRank={showTopRanks && index < PLAYLIST_TOP_RANK_COUNT ? index + 1 : null}
                        />
                    ))}
                </div>
            )}
        </ModulePageShell>
    );
}
