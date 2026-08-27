'use client';

import { Award, Plus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModulePreviewFrame, type ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';
import { SpotifyMark, YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { cn } from '@/lib/utils';

type SampleSuggestion = {
    title: string;
    artist: string;
    upvoteCount: number;
    downvoteCount: number;
    upvoted: boolean;
    service: 'spotify' | 'youtube';
    topRank: number | null;
};

const SAMPLE_SUGGESTIONS: SampleSuggestion[] = [
    { title: 'September', artist: 'Earth, Wind & Fire', upvoteCount: 18, downvoteCount: 1, upvoted: true, service: 'spotify', topRank: 1 },
    { title: 'Dancing Queen', artist: 'ABBA', upvoteCount: 11, downvoteCount: 2, upvoted: false, service: 'youtube', topRank: null },
    { title: 'Valerie', artist: 'Mark Ronson', upvoteCount: 7, downvoteCount: 0, upvoted: false, service: 'spotify', topRank: null },
];

/** Replica of components/playlist/PlaylistItemRow.tsx — ranked suggestions with paired up/down votes. */
export function PlaylistPreview({ variant }: ModulePreviewProps) {
    const t = useTranslations('PlaylistPage');

    return (
        <ModulePreviewFrame variant={variant} surfaceClassName="bg-background">
            {/* Suggest action */}
            <div className="flex items-center justify-end px-4 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1.5 text-sm font-semibold text-white">
                    <Plus className="h-4 w-4" />
                    {t('suggest')}
                </span>
            </div>

            {/* Suggestions */}
            <div className="mt-4 flex flex-col gap-2.5 px-4">
                {SAMPLE_SUGGESTIONS.map((suggestion) => (
                    <article
                        key={suggestion.title}
                        className={cn(
                            'relative overflow-hidden rounded-[1.5rem] border bg-card shadow-[0_18px_36px_rgba(35,28,22,0.07)]',
                            suggestion.topRank ? 'border-primary/45 ring-1 ring-primary/15' : 'border-border/60'
                        )}
                    >
                        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                            <div className="min-w-0 flex-1">
                                {/* Title */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold text-ink">{suggestion.title}</h3>
                                    {suggestion.topRank && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary-dark uppercase">
                                            <Award className="h-3.5 w-3.5" />
                                            {t('topSongBadge', { rank: suggestion.topRank })}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary-dark uppercase">
                                        {suggestion.service === 'spotify' ? (
                                            <SpotifyMark className="h-3.5 w-3.5" />
                                        ) : (
                                            <YouTubeMark className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-ink-muted">{suggestion.artist}</p>
                            </div>

                            {/* Voting */}
                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={cn(
                                        'flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-3 py-2',
                                        suggestion.upvoted ? 'bg-primary-light text-primary shadow-sm shadow-primary/10' : 'text-ink-faint'
                                    )}
                                >
                                    <ThumbsUp
                                        className={cn('h-4 w-4', suggestion.upvoted && 'fill-primary')}
                                        strokeWidth={suggestion.upvoted ? 0 : 1.8}
                                    />
                                    <span className="text-[11px] font-bold tabular-nums">{suggestion.upvoteCount}</span>
                                </span>
                                <span className="flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-ink-faint">
                                    <ThumbsDown className="h-4 w-4" strokeWidth={1.8} />
                                    <span className="text-[11px] font-bold tabular-nums">{suggestion.downvoteCount}</span>
                                </span>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </ModulePreviewFrame>
    );
}
