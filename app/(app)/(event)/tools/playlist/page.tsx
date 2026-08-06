'use client';

import { AlertCircle, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PlaylistItemRow } from '@/components/playlist';
import { useEventModules } from '@/hooks/useEventModules';
import { usePlaylistLeaderboard, usePlaylistSuggestions } from '@/hooks/usePlaylist';
import { routes } from '@/lib/routes';
import { useComposer } from '@/providers/ComposerProvider';
import { useActiveEvent, useIsHost } from '@/providers/EventProvider';

export default function PlaylistPage() {
    const t = useTranslations('PlaylistPage');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const { openSongComposer, canComposeSong } = useComposer();
    const eventId = activeEvent?.id ?? null;

    const { data: modules = [], isLoading: isLoadingModules } = useEventModules(eventId);
    const { data: suggestionsData, isLoading: suggestionsLoading } = usePlaylistSuggestions(eventId);
    const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = usePlaylistLeaderboard(eventId, isHost);
    const playlistEnabled = modules.some((module) => module.moduleKey === 'playlist' && module.isEnabled);
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
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('disabledBody')}</p>
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
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
                        <div className="max-w-xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-faint">{t('leaderboardEyebrow')}</p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{t('leaderboardTitle')}</h2>
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('leaderboardBody')}</p>
                        </div>
                        {isLoadingLeaderboard && <span className="text-sm text-ink-faint">{t('loadingLeaderboard')}</span>}
                    </div>

                    {!isLoadingLeaderboard && leaderboard.length === 0 ? (
                        <div className="py-6 text-sm text-ink-muted">{t('leaderboardEmpty')}</div>
                    ) : (
                        <ol className="mt-4 border-t border-border/60">
                            {leaderboard.map((song) => (
                                <li key={song.id} className="grid grid-cols-[auto,1fr,auto] gap-4 border-b border-border/60 py-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background text-base font-semibold text-ink">
                                        {song.rank}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate text-base font-semibold text-ink">{song.title}</h3>
                                        <p className="mt-0.5 truncate text-sm text-ink-muted">{song.artist ?? t('artistUnknown')}</p>
                                        {song.comment && <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-faint">{song.comment}</p>}
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-ink-muted">
                                            <span className="text-[10px]">Up</span>
                                            <span className="tabular-nums">{song.upvoteCount}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-muted px-2.5 py-1">
                                            <span className="text-[10px]">Down</span>
                                            <span className="tabular-nums">{song.downvoteCount}</span>
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
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
