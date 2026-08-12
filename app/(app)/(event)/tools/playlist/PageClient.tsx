'use client';

import { AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createContext, type ReactNode, useContext } from 'react';

import { PlaylistItemRow, PlaylistLeaderboard } from '@/components/playlist';
import { EventRouteGate, EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventModules } from '@/hooks/useEventModules';
import { usePlaylistLeaderboard, usePlaylistSuggestions } from '@/hooks/usePlaylist';
import type { EventDetailResponseDto, PlaylistSuggestionLeaderboardDto, PlaylistSuggestionResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { findPlansUnlockingModule } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useComposer } from '@/providers/ComposerProvider';

const HOST_LEADERBOARD_VISIBLE_SONGS = 3;

type PlaylistPageContextValue = {
    activeEvent: EventDetailResponseDto;
    canSuggest: boolean;
    eventId: string;
    isHost: boolean;
    isLoadingLeaderboard: boolean;
    leaderboard: PlaylistSuggestionLeaderboardDto[];
    onSuggest: () => void;
    suggestions: PlaylistSuggestionResponseDto[];
    suggestionsLoading: boolean;
    t: ReturnType<typeof useTranslations>;
};

const PlaylistPageContext = createContext<PlaylistPageContextValue | null>(null);

export default function PlaylistPage() {
    return <EventRouteGate>{(context) => <PlaylistScreen {...context} />}</EventRouteGate>;
}

function usePlaylistPage() {
    const context = useContext(PlaylistPageContext);
    if (!context) {
        throw new Error('usePlaylistPage must be used within PlaylistPageContext');
    }

    return context;
}

function PlaylistScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const t = useTranslations('PlaylistPage');
    const { openSongComposer, canComposeSong } = useComposer();
    const { data: appConfig } = useAppConfig();
    const { data: modules = [], isLoading: isLoadingModules } = useEventModules(eventId);
    const { data: suggestionsData, isLoading: suggestionsLoading } = usePlaylistSuggestions(eventId);
    const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = usePlaylistLeaderboard(eventId, isHost);
    const playlistEnabled = modules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const playlistInRegistry = appConfig?.modules.some((module) => module.moduleKey === 'playlist' && module.isEnabled) ?? true;
    const unlockingPlans = playlistInRegistry ? findPlansUnlockingModule(appConfig?.planTiers ?? [], 'playlist') : [];
    const unlockPlanNames = unlockingPlans.map((plan) => plan.name).join(', ');
    const suggestions = suggestionsData ?? [];
    const canSuggest = canComposeSong && isEventWritable(activeEvent.status);

    return (
        <PlaylistPageState
            disabledContent={
                <PlaylistDisabledState
                    backLabel={t('backToFeed')}
                    body={playlistInRegistry && unlockPlanNames ? t('disabledUpgradeBody', { plans: unlockPlanNames }) : t('disabledBody')}
                    eventId={eventId}
                    title={t('disabledTitle')}
                />
            }
            isLoading={isLoadingModules}
            isPlaylistEnabled={playlistEnabled}
            playlistContent={
                <PlaylistPageContext.Provider
                    value={{
                        activeEvent,
                        canSuggest,
                        eventId,
                        isHost,
                        isLoadingLeaderboard,
                        leaderboard,
                        onSuggest: openSongComposer,
                        suggestions,
                        suggestionsLoading,
                        t,
                    }}
                >
                    <PlaylistContent />
                </PlaylistPageContext.Provider>
            }
        />
    );
}

function PlaylistPageState({
    disabledContent,
    isLoading,
    isPlaylistEnabled,
    playlistContent,
}: {
    disabledContent: ReactNode;
    isLoading: boolean;
    isPlaylistEnabled: boolean;
    playlistContent: ReactNode;
}) {
    if (isLoading) {
        return <EventRouteSpinner />;
    }

    if (!isPlaylistEnabled) {
        return disabledContent;
    }

    return playlistContent;
}

function PlaylistContent() {
    const { activeEvent, canSuggest, eventId, isHost, isLoadingLeaderboard, leaderboard, onSuggest, suggestions, suggestionsLoading, t } =
        usePlaylistPage();

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
            {!isEventWritable(activeEvent.status) && (
                <p className="mb-5 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('readOnly')}</p>
            )}

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

function PlaylistDisabledState({ backLabel, body, eventId, title }: { backLabel: string; body: string; eventId: string; title: string }) {
    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <div className="flex items-center gap-3 py-4">
                <Link
                    href={routes.post.feed(eventId)}
                    aria-label={backLabel}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-ink">{title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
