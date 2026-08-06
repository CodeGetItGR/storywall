'use client';

import { BadgePlus, Music3, Play, TextCursorInput } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, type ComponentType, type ReactNode, type SubmitEvent, useState } from 'react';

import { getErrorMessage, isModuleNotAvailableError } from '@/lib/api/errors';

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

function FieldShell({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: ReactNode }) {
    return (
        <label className="group block">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
            </span>
            {children}
        </label>
    );
}

export function AddSongForm({ isSubmitting, canSubmit, onSubmit, compact = false }: AddSongFormProps) {
    const t = useTranslations('PlaylistPage');
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

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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
            setSubmitError(isModuleNotAvailableError(error) ? t('moduleUnavailable') : getErrorMessage(error, t('submitFailed')));
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={`mb-5 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_20px_40px_rgba(35,28,22,0.08)] ${compact ? 'shadow-[0_14px_28px_rgba(35,28,22,0.06)]' : ''}`}
        >
            <div className={compact ? 'px-4 pt-4 text-ink' : 'bg-gradient-brand px-5 py-5 text-white'}>
                <div className={`flex items-start gap-4 ${compact ? 'items-center' : ''}`}>
                    <div
                        className={`flex shrink-0 items-center justify-center rounded-2xl ${compact ? 'h-10 w-10 bg-primary-light text-primary-dark' : 'h-12 w-12 bg-white/15 text-white ring-1 ring-white/15 backdrop-blur-sm'}`}
                    >
                        <BadgePlus className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${compact ? 'text-ink-faint' : 'text-white/75'}`}>
                            {t('suggestASong')}
                        </p>
                        <h2 className={`mt-1 font-semibold leading-tight ${compact ? 'text-base text-ink' : 'text-lg text-white'}`}>
                            {t('formTitle')}
                        </h2>
                        {!compact && <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/80">{t('formSubtitle')}</p>}
                    </div>
                </div>
            </div>

            <div className={compact ? 'space-y-3 px-4 pb-4 pt-4' : 'space-y-4 px-5 py-5'}>
                <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell icon={Music3} label={t('songTitle')}>
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
                    </FieldShell>

                    <FieldShell icon={Music3} label={t('artist')}>
                        <div className="relative">
                            <input
                                type="text"
                                value={artist}
                                onChange={handleArtistChange}
                                placeholder={t('artistPlaceholder')}
                                className={`w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${compact ? 'py-3' : 'py-3.5'}`}
                            />
                        </div>
                    </FieldShell>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell icon={YouTubeMark} label={t('youtubeUrl')}>
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
                    </FieldShell>

                    <FieldShell icon={SpotifyMark} label={t('spotifyUrl')}>
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
                    </FieldShell>
                </div>

                {compact ? (
                    <details className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                        <summary className="cursor-pointer list-none text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                            {t('moreDetails')}
                        </summary>
                        <div className="mt-3">
                            <FieldShell icon={TextCursorInput} label={t('comment')}>
                                <textarea
                                    value={comment}
                                    onChange={handleCommentChange}
                                    rows={3}
                                    placeholder={t('commentPlaceholder')}
                                    className="w-full resize-none rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                />
                            </FieldShell>
                        </div>
                    </details>
                ) : (
                    <FieldShell icon={TextCursorInput} label={t('comment')}>
                        <textarea
                            value={comment}
                            onChange={handleCommentChange}
                            rows={4}
                            placeholder={t('commentPlaceholder')}
                            className="w-full resize-none rounded-2xl border border-border/70 bg-background/80 px-4 py-3.5 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                        />
                    </FieldShell>
                )}

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
