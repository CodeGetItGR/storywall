'use client';

import { AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PlaylistItemRow, PlaylistLeaderboard } from '@/components/playlist';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventModules } from '@/hooks/useEventModules';
import { usePlaylistLeaderboard, usePlaylistSuggestions } from '@/hooks/usePlaylist';
import { findPlansUnlockingModule } from '@/lib/planTiers';
import { routes } from '@/lib/routes';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

const HOST_LEADERBOARD_VISIBLE_SONGS = 3;

export default function PlaylistPage() {
    const t = useTranslations('PlaylistPage');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const { openSongComposer, canComposeSong } = useComposer();
    const eventId = activeEvent?.id ?? null;

    const { data: appConfig } = useAppConfig();
    const { data: modules = [], isLoading: isLoadingModules } = useEventModules(eventId);
    const { data: suggestionsData, isLoading: suggestionsLoading } = usePlaylistSuggestions(eventId);
    const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = usePlaylistLeaderboard(eventId, isHost);
    const playlistEnabled = modules.some((module) => module.moduleKey === 'playlist' && module.isAvailable);
    const playlistInRegistry = appConfig?.eventModuleKeys.includes('playlist') ?? true;
    const unlockingPlans = findPlansUnlockingModule(appConfig?.planTiers ?? [], 'playlist');
    const unlockPlanNames = unlockingPlans.map((plan) => plan.name).join(', ');
    const suggestions = suggestionsData ?? [];

    if (!eventId) {
        return null;
    }

    if (isLoadingModules) {
        return null;
    }

    if (!playlistEnabled) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
                <div className="flex items-center gap-3 py-4">
                    <Link
                        href={routes.post.feed(eventId)}
                        aria-label={t('backToFeed')}
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
                            <h2 className="text-sm font-semibold text-ink">{t('disabledTitle')}</h2>
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                                {playlistInRegistry && unlockPlanNames ? t('disabledUpgradeBody', { plans: unlockPlanNames }) : t('disabledBody')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 pb-24 lg:pb-8">
            <div className="mb-5 flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={routes.post.feed(eventId)}
                        aria-label={t('backToFeed')}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={openSongComposer}
                    disabled={!canComposeSong}
                    aria-label={t('suggestASong')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" />
                    {t('suggest')}
                </button>
            </div>

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
