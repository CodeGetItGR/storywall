'use client';

import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';
import type { PlaylistSuggestionLeaderboardDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type PlaylistLeaderboardProps = {
    leaderboard: PlaylistSuggestionLeaderboardDto[];
    isLoading: boolean;
    maxVisibleSongs?: number;
};

export function PlaylistLeaderboard({ leaderboard, isLoading, maxVisibleSongs = 3 }: PlaylistLeaderboardProps) {
    const t = useTranslations('PlaylistPage');
    const visibleSongs = leaderboard.slice(0, maxVisibleSongs);
    const hiddenCount = Math.max(0, leaderboard.length - visibleSongs.length);

    return (
        <section className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-[0_14px_30px_rgba(35,28,22,0.06)]">
            <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-[1.125rem]">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">{t('leaderboardEyebrow')}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-ink sm:text-xl">{t('leaderboardTitle')}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                            <ArrowUp className="h-3.5 w-3.5" />
                            {t('leaderboardTopCount', { count: maxVisibleSongs })}
                        </span>
                    </div>
                    <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-ink-muted sm:text-sm">{t('leaderboardBody')}</p>
                </div>

                <div className="text-left text-[11px] font-medium text-ink-faint sm:text-right">
                    {hiddenCount > 0 && <p>{t('leaderboardShowingMore', { shown: visibleSongs.length, total: leaderboard.length })}</p>}
                    {isLoading && <p className="mt-1">{t('loadingLeaderboard')}</p>}
                </div>
            </div>

            {isLoading ? (
                <ol className="divide-y divide-border/55">
                    {Array.from({ length: maxVisibleSongs }).map((_, index) => (
                        <li key={index} className="flex items-center gap-3 px-4 py-2.5 sm:grid sm:grid-cols-[auto,1fr,auto] sm:items-center sm:gap-3 sm:px-5 sm:py-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-7 w-7 shrink-0 rounded-full sm:h-8 sm:w-8" />
                                <div className="min-w-0 space-y-1">
                                    <Skeleton className="h-3.5 w-32 max-w-[72%] rounded-full" />
                                    <Skeleton className="h-3 w-24 max-w-[56%] rounded-full" />
                                </div>
                            </div>
                            <div className="ml-auto flex items-center">
                                <Skeleton className="h-6 w-12 rounded-full sm:h-7 sm:w-14" />
                            </div>
                        </li>
                    ))}
                </ol>
            ) : leaderboard.length === 0 ? (
                <div className="px-4 py-4 text-sm text-ink-muted sm:px-5">{t('leaderboardEmpty')}</div>
            ) : (
                <ol className="divide-y divide-border/55">
                    {visibleSongs.map((song) => (
                        <li
                            key={song.id}
                            className={cn(
                                'flex items-center gap-3 px-4 py-2.5 sm:grid sm:grid-cols-[auto,1fr,auto] sm:items-center sm:gap-3 sm:px-5 sm:py-3',
                                'transition-colors duration-200 hover:bg-surface-muted/45'
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-ink shadow-sm shadow-black/5 sm:h-8 sm:w-8">
                                    {song.rank}
                                </div>

                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-semibold text-ink sm:text-[15px]">{song.title}</h3>
                                    <p className="truncate text-xs text-ink-muted">{song.artist ?? t('artistUnknown')}</p>
                                </div>
                            </div>

                            <div className="ml-auto flex items-center sm:shrink-0 sm:ml-0 sm:justify-end">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink-muted">
                                    <ArrowUp className="h-3.5 w-3.5 text-ink-faint" />
                                    <span>{song.upvoteCount}</span>
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
