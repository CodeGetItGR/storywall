'use client';

import { Loader2, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useCreatePlaylistVote, useDeletePlaylistSuggestion, useDeletePlaylistVote, usePlaylistVotes } from '@/hooks/usePlaylist';
import { getErrorMessage, isModuleNotAvailableError } from '@/lib/api/errors';
import type { PlaylistSuggestionResponseDto, PlaylistVoteType } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { cn } from '@/lib/utils';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type PlaylistItemRowProps = {
    suggestion: PlaylistSuggestionResponseDto;
};

function SpotifyMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M12 2.75a9.25 9.25 0 1 0 0 18.5A9.25 9.25 0 0 0 12 2.75Zm4.24 13.31a.9.9 0 0 1-1.24.3c-2.8-1.72-6.33-2.11-10.49-1.15a.9.9 0 1 1-.4-1.75c4.52-1.04 8.43-.6 11.64 1.37.43.26.57.82.29 1.23Zm1.03-2.29a1.13 1.13 0 0 1-1.55.38c-3.08-1.9-7.77-2.45-11.4-1.34a1.13 1.13 0 1 1-.66-2.16c4.14-1.26 9.27-.64 12.86 1.57.53.32.7.98.38 1.55Zm.04-2.43C13.7 9.27 7.74 9.08 4.28 10.15a1.37 1.37 0 1 1-.8-2.62c4.01-1.22 10.67-.99 15.08 1.62.7.41.93 1.32.5 2.02-.41.68-1.3.9-1.82.17Z"
                fill="currentColor"
            />
        </svg>
    );
}

function YouTubeMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M21.6 7.4c-.2-.8-.8-1.4-1.6-1.6C18.5 5.5 12 5.5 12 5.5s-6.5 0-8 .3c-.8.2-1.4.8-1.6 1.6C2 9 2 12 2 12s0 3 .3 4.6c.2.8.8 1.4 1.6 1.6 1.5.3 8 .3 8 .3s6.5 0 8-.3c.8-.2 1.4-.8 1.6-1.6.3-1.6.3-4.6.3-4.6s0-3-.3-4.6Z"
                fill="currentColor"
            />
            <path d="m10 15.2 5.2-3.2L10 8.8v6.4Z" fill="#fff" />
        </svg>
    );
}

function buildSpotifyEmbedUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('spotify.com')) return null;

        const parts = parsed.pathname.split('/').filter(Boolean);
        const trackIndex = parts.indexOf('track');
        const trackId = trackIndex >= 0 ? parts[trackIndex + 1] : parts[parts.length - 1];
        return trackId ? `https://open.spotify.com/embed/track/${trackId}` : null;
    } catch {
        return null;
    }
}

function buildYouTubeEmbedUrl(url: string | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        let videoId: string | null = null;

        if (parsed.hostname.includes('youtu.be')) {
            videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
        } else if (parsed.hostname.includes('youtube.com')) {
            videoId = parsed.searchParams.get('v');
            if (!videoId) {
                const parts = parsed.pathname.split('/').filter(Boolean);
                const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
                videoId = embedIndex >= 0 ? (parts[embedIndex + 1] ?? null) : null;
            }
        }

        return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    } catch {
        return null;
    }
}

export function PlaylistItemRow({ suggestion }: PlaylistItemRowProps) {
    const t = useTranslations('PlaylistPage');
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const eventId = activeEvent?.id ?? '';
    const memberId = activeMember?.id ?? null;

    const currentVotesQuery = usePlaylistVotes(suggestion.id, false);
    const createVote = useCreatePlaylistVote(eventId);
    const deleteVote = useDeletePlaylistVote(eventId, suggestion.id);
    const deleteSuggestion = useDeletePlaylistSuggestion(eventId);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [resolvingVote, setResolvingVote] = useState(false);
    const [voteError, setVoteError] = useState<string | null>(null);

    const upvoteActive = suggestion.myVote === 'UPVOTE';
    const downvoteActive = suggestion.myVote === 'DOWNVOTE';
    const canWrite = isEventWritable(activeEvent?.status);
    const isBusy = createVote.isPending || deleteVote.isPending || resolvingVote;
    const canVote = Boolean(memberId) && canWrite;
    const canDeleteSuggestion = Boolean(memberId && canWrite && (isHost || suggestion.authorMemberId === memberId));

    const spotifyEmbedUrl = useMemo(() => buildSpotifyEmbedUrl(suggestion.spotifyUrl), [suggestion.spotifyUrl]);
    const youtubeEmbedUrl = useMemo(() => buildYouTubeEmbedUrl(suggestion.youtubeUrl), [suggestion.youtubeUrl]);
    const previewEmbedUrl = spotifyEmbedUrl ?? youtubeEmbedUrl;
    const previewSource = spotifyEmbedUrl ? 'spotify' : youtubeEmbedUrl ? 'youtube' : null;
    const openSpotifyLabel = t('openSpotify');
    const openYouTubeLabel = t('openYouTube');

    async function clearCurrentVote() {
        if (!memberId) return;

        setResolvingVote(true);
        try {
            const res = await currentVotesQuery.refetch();
            const currentVote = res.data?.find((vote) => vote.memberId === memberId);
            if (!currentVote) return;

            await deleteVote.mutateAsync(currentVote.id);
        } finally {
            setResolvingVote(false);
        }
    }

    async function handleVote(voteType: PlaylistVoteType) {
        if (!memberId || !canWrite || isBusy) return;

        setVoteError(null);

        try {
            if (suggestion.myVote === voteType) {
                await clearCurrentVote();
                return;
            }

            await createVote.mutateAsync({
                playlistSuggestionId: suggestion.id,
                voteType,
            });
        } catch (error) {
            setVoteError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : getErrorMessage(error, t('voteFailed')));
        }
    }

    function handleUpvoteClick() {
        void handleVote('UPVOTE');
    }

    function handleDownvoteClick() {
        void handleVote('DOWNVOTE');
    }

    function handleDeleteRequest() {
        if (!canDeleteSuggestion) return;
        setConfirmDeleteOpen(true);
    }

    function handleCloseDeleteConfirm() {
        setConfirmDeleteOpen(false);
    }

    async function handleDeleteSuggestion() {
        handleCloseDeleteConfirm();
        await deleteSuggestion.mutateAsync(suggestion.id);
    }

    return (
        <article className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-[0_18px_36px_rgba(35,28,22,0.07)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(35,28,22,0.1)]">
            <div className="grid grid-cols-[auto,1fr] gap-0">
                <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-ink">{suggestion.title}</h3>
                            {previewSource && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                                        'bg-primary-light text-primary-dark'
                                    )}
                                >
                                    {previewSource === 'spotify' ? <SpotifyMark className="h-3.5 w-3.5" /> : <YouTubeMark className="h-3.5 w-3.5" />}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">{suggestion.artist ?? t('artistUnknown')}</p>
                        {suggestion.comment && <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-faint">{suggestion.comment}</p>}

                        <div className="mt-3 flex flex-wrap gap-2">
                            {suggestion.spotifyUrl && (
                                <a
                                    href={suggestion.spotifyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary-dark transition-colors hover:bg-primary-light/80"
                                >
                                    <SpotifyMark className="h-4 w-4" />
                                    {openSpotifyLabel}
                                </a>
                            )}
                            {suggestion.youtubeUrl && (
                                <a
                                    href={suggestion.youtubeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-primary-light hover:text-primary-dark"
                                >
                                    <YouTubeMark className="h-4 w-4" />
                                    {openYouTubeLabel}
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={handleUpvoteClick}
                            aria-pressed={upvoteActive}
                            aria-label={upvoteActive ? t('removeVote') : t('voteForThisSong')}
                            disabled={!canVote || isBusy}
                            className={cn(
                                'flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all',
                                upvoteActive
                                    ? 'bg-primary-light text-primary shadow-sm shadow-primary/10'
                                    : 'text-ink-faint hover:bg-surface-muted hover:text-ink-muted',
                                (!canVote || isBusy) && 'cursor-not-allowed opacity-60'
                            )}
                        >
                            <ThumbsUp className={cn('h-4 w-4', upvoteActive && 'fill-primary')} strokeWidth={upvoteActive ? 0 : 1.8} />
                            <span className="text-[11px] font-bold tabular-nums">{suggestion.upvoteCount}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownvoteClick}
                            aria-pressed={downvoteActive}
                            aria-label={downvoteActive ? t('removeVote') : t('downvoteThisSong')}
                            disabled={!canVote || isBusy}
                            className={cn(
                                'flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all',
                                downvoteActive
                                    ? 'bg-destructive/10 text-destructive shadow-sm shadow-destructive/10'
                                    : 'text-ink-faint hover:bg-surface-muted hover:text-ink-muted',
                                (!canVote || isBusy) && 'cursor-not-allowed opacity-60'
                            )}
                        >
                            <ThumbsDown className={cn('h-4 w-4', downvoteActive && 'fill-destructive')} strokeWidth={downvoteActive ? 0 : 1.8} />
                            <span className="text-[11px] font-bold tabular-nums">{suggestion.downvoteCount}</span>
                        </button>

                        {(voteError || !canWrite) && <p className="basis-full text-right text-xs text-destructive">{voteError ?? t('readOnly')}</p>}

                        {canDeleteSuggestion && (
                            <button
                                type="button"
                                onClick={handleDeleteRequest}
                                disabled={deleteSuggestion.isPending}
                                aria-label={t('deleteSuggestion')}
                                className={cn(
                                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors',
                                    'text-ink-faint hover:bg-surface-muted hover:text-primary-dark',
                                    deleteSuggestion.isPending && 'cursor-not-allowed opacity-60'
                                )}
                            >
                                {deleteSuggestion.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                </div>

                {previewEmbedUrl && (
                    <div className="border-t border-border/60 bg-linear-to-b from-background to-surface-muted/40 p-4 sm:p-5">
                        <div className="overflow-hidden rounded-[1.25rem] border border-border bg-background shadow-[0_12px_30px_rgba(35,28,22,0.06)]">
                            <iframe
                                title={suggestion.title}
                                src={previewEmbedUrl}
                                className="h-60 w-full"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                            />
                        </div>
                    </div>
                )}
            </div>

            <ConfirmActionModal
                open={confirmDeleteOpen}
                onClose={handleCloseDeleteConfirm}
                onConfirm={handleDeleteSuggestion}
                title={t('deleteSuggestionConfirmTitle')}
                body={t('deleteSuggestionConfirmBody')}
                confirmLabel={t('deleteSuggestionConfirm')}
                cancelLabel={t('cancel')}
                isConfirming={deleteSuggestion.isPending}
            />
        </article>
    );
}
