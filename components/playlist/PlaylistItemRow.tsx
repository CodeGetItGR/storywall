'use client';

import { Loader2, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { SpotifyMark, YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useCreatePlaylistVote, useDeletePlaylistSuggestion, useDeletePlaylistVote, usePlaylistVotes } from '@/hooks/usePlaylist';
import { isModuleNotAvailableError } from '@/lib/api/errors';
import type { PlaylistSuggestionResponseDto, PlaylistVoteType } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { buildSpotifyEmbedUrl, buildYouTubeEmbedUrl } from '@/lib/playlistEmbeds';
import { cn } from '@/lib/utils';
import { useActiveEvent, useActiveMember, useIsHost } from '@/providers/EventProvider';

type PlaylistItemRowProps = {
    suggestion: PlaylistSuggestionResponseDto;
};

export function PlaylistItemRow({ suggestion }: PlaylistItemRowProps) {
    const t = useTranslations('PlaylistPage');
    const toErrorMessage = useApiErrorMessage();
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
            setVoteError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : toErrorMessage(error, t('voteFailed')));
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
