'use client';

import { BadgePlus, Music3, Play, TextCursorInput } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { type ChangeEvent, useState } from 'react';

import { AddSongFieldShell } from '@/components/playlist/AddSongFieldShell';
import { SpotifyMark, YouTubeMark } from '@/components/playlist/MusicServiceMarks';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { isModuleNotAvailableError } from '@/lib/api/errors';

type PlaylistSuggestionInput = {
    title: string;
    artist?: string;
    youtubeUrl?: string;
    spotifyUrl?: string;
    comment?: string;
};

type AddSongFormProps = {
    isSubmitting: boolean;
    canSubmit: boolean;
    onSubmit: (input: PlaylistSuggestionInput) => Promise<void>;
    compact?: boolean;
};

export function AddSongForm({ isSubmitting, canSubmit, onSubmit, compact = false }: AddSongFormProps) {
    const t = useTranslations('PlaylistPage');
    const toErrorMessage = useApiErrorMessage();
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [spotifyUrl, setSpotifyUrl] = useState('');
    const [comment, setComment] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

    function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
        setTitle(event.target.value);
    }

    function handleArtistChange(event: ChangeEvent<HTMLInputElement>) {
        setArtist(event.target.value);
    }

    function handleYoutubeUrlChange(event: ChangeEvent<HTMLInputElement>) {
        setYoutubeUrl(event.target.value);
    }

    function handleSpotifyUrlChange(event: ChangeEvent<HTMLInputElement>) {
        setSpotifyUrl(event.target.value);
    }

    function handleCommentChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setComment(event.target.value);
    }

    async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const trimmedTitle = title.trim();
        const trimmedArtist = artist.trim();
        if (!canSubmit || !trimmedTitle) return;

        setSubmitError(null);

        try {
            await onSubmit({
                title: trimmedTitle,
                artist: trimmedArtist || undefined,
                youtubeUrl: youtubeUrl.trim() || undefined,
                spotifyUrl: spotifyUrl.trim() || undefined,
                comment: comment.trim() || undefined,
            });

            setTitle('');
            setArtist('');
            setYoutubeUrl('');
            setSpotifyUrl('');
            setComment('');
        } catch (error) {
            setSubmitError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : toErrorMessage(error, t('submitFailed')));
        }
    }

    return (
        <form onSubmit={handleSubmit} className={`mb-5`}>
            <div className={'px-4 pt-4 text-ink mb-4'}>
                <div className={`flex gap-4 items-center`}>
                    <div
                        className={`flex shrink-0 items-center justify-center rounded-2xl ${compact ? 'h-10 w-10 bg-primary-light text-primary-dark' : 'h-12 w-12 bg-white/15 text-white ring-1 ring-white/15 backdrop-blur-sm'}`}
                    >
                        <BadgePlus className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                    </div>
                    <div className="min-w-0 flex items-center">
                        <h2 className={`mt-1 font-semibold leading-tight text-base text-ink`}>
                            {t('suggestASong')}
                        </h2>
                    </div>
                </div>
            </div>

            <div className={compact ? 'space-y-3 px-4 pb-4 pt-4' : 'space-y-4 px-5 py-5'}>
                <div className="grid gap-4 md:grid-cols-2">
                    <AddSongFieldShell icon={Music3} label={t('songTitle')} required>
                        <div className="relative">
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                placeholder={t('songTitlePlaceholder')}
                                required
                                className={`w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${compact ? 'py-3' : 'py-3.5'}`}
                            />
                        </div>
                    </AddSongFieldShell>

                    <AddSongFieldShell icon={Music3} label={t('artist')} optional>
                        <div className="relative">
                            <input
                                type="text"
                                value={artist}
                                onChange={handleArtistChange}
                                placeholder={t('artistPlaceholder')}
                                className={`w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${compact ? 'py-3' : 'py-3.5'}`}
                            />
                        </div>
                    </AddSongFieldShell>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <AddSongFieldShell icon={YouTubeMark} label={t('youtubeUrl')} optional>
                        <div className="relative">
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={handleYoutubeUrlChange}
                                placeholder={t('youtubePlaceholder')}
                                inputMode="url"
                                className={`w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${compact ? 'py-3' : 'py-3.5'}`}
                            />
                        </div>
                    </AddSongFieldShell>

                    <AddSongFieldShell icon={SpotifyMark} label={t('spotifyUrl')} optional iconClassName={'text-[#1DB954]'}>
                        <div className="relative">
                            <input
                                type="url"
                                value={spotifyUrl}
                                onChange={handleSpotifyUrlChange}
                                placeholder={t('spotifyPlaceholder')}
                                inputMode="url"
                                className={`w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${compact ? 'py-3' : 'py-3.5'}`}
                            />
                        </div>
                    </AddSongFieldShell>
                </div>

                <AddSongFieldShell icon={TextCursorInput} label={t('comment')} optional>
                    <textarea
                        value={comment}
                        onChange={handleCommentChange}
                        rows={4}
                        placeholder={t('commentPlaceholder')}
                        className="w-full resize-none rounded-2xl border border-border/70 bg-background/80 px-4 py-3.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                    />
                </AddSongFieldShell>

                {submitError && <p className="text-xs text-destructive">{submitError}</p>}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={isSubmitting || !canSubmit || !title.trim()}
                        className={`inline-flex items-center gap-2 rounded-full bg-gradient-brand text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:hover:shadow-none ${compact ? 'px-4 py-2.5' : 'px-5 py-3'}`}
                    >
                        <Play className="h-4 w-4 fill-current" />
                        {t('addToPlaylist')}
                    </button>
                </div>
            </div>
        </form>
    );
}
