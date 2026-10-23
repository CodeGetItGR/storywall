'use client';

import { ListMusic, Music, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PiMusicNotesPlusDuotone } from 'react-icons/pi';

import { PlaylistItemRow } from '@/components/playlist/PlaylistItemRow';
import { PlaylistListSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { AppLink } from '@/components/ui/AppLink';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';
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
    // Hosts and DJs get a link to the live list.
    showLiveLink?: boolean;
}

export function PlaylistContent({
    canSuggest,
    eventId,
    isEventWritable,
    onSuggest,
    suggestions,
    suggestionsLoading,
    showTitleIcon = false,
    showLiveLink = false,
}: PlaylistContentProps) {
    const t = useTranslations('PlaylistPage');
    const tVendors = useTranslations('Vendors');
    const playlistCopy = useActiveModuleCopy('playlist');
    const showTopRanks = shouldShowPlaylistTopRanks(suggestions);

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={playlistCopy.name}
            icon={Music}
            iconClassName="text-violet-500"
            showTitleIcon={showTitleIcon}
            backLabel={t('backToFeed')}
            backHref={routes.events.feed(eventId)}
            action={
                showLiveLink || suggestions.length > 0 ? (
                    <div className="flex items-center gap-2">
                        {/* Live list */}
                        {showLiveLink && (
                            <AppLink
                                href={routes.events.tools.playlistLive(eventId)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-ink focus-ring"
                            >
                                <ListMusic className="h-4 w-4" aria-hidden="true" />
                                {tVendors('live.open')}
                            </AppLink>
                        )}

                        {/* Suggest */}
                        {suggestions.length > 0 && (
                            <button
                                type="button"
                                onClick={onSuggest}
                                disabled={!canSuggest}
                                aria-label={t('suggestASong')}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-all bg-gradient-brand hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Plus className="h-4 w-4" />
                                {t('suggest')}
                            </button>
                        )}
                    </div>
                ) : undefined
            }
        >
            {/* Status */}
            {!isEventWritable && <p className="mb-5 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('readOnly')}</p>}

            {/* Content */}
            {suggestionsLoading ? (
                <PlaylistListSkeleton />
            ) : suggestions.length === 0 ? (
                <ToolEmptyState
                    title={t('emptyTitle')}
                    body={t('emptyBody')}
                    icon={PiMusicNotesPlusDuotone}
                    action={
                        <button
                            type="button"
                            onClick={onSuggest}
                            disabled={!canSuggest}
                            aria-label={t('suggestASong')}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-all bg-gradient-brand hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
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
