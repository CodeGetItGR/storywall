'use client';

import { AlertCircle, ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { AddSongForm, PlaylistItemRow } from '@/components/playlist';
import { useEventModules } from '@/hooks/useEventModules';
import { useCreatePlaylistSuggestion, usePlaylistSuggestions } from '@/hooks/usePlaylist';
import { routes } from '@/lib/routes';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

export default function PlaylistPage() {
    const t = useTranslations('PlaylistPage');
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const eventId = activeEvent?.id ?? null;
    const memberId = activeMember?.id ?? null;
    const [showAdd, setShowAdd] = useState(false);

    const { data: modules = [], isLoading: isLoadingModules } = useEventModules(eventId);
    const suggestionsQuery = usePlaylistSuggestions(eventId);
    const createSuggestion = useCreatePlaylistSuggestion();
    const playlistEnabled = modules.some((module) => module.moduleKey === 'playlist' && module.isEnabled);
    async function handleCreateSuggestion(input: {
        title: string;
        artist?: string;
        youtubeUrl?: string;
        spotifyUrl?: string;
        comment?: string;
    }) {
        if (!eventId || !memberId) return;

        await createSuggestion.mutateAsync({
            eventId,
            authorMemberId: memberId,
            title: input.title,
            artist: input.artist,
            youtubeUrl: input.youtubeUrl,
            spotifyUrl: input.spotifyUrl,
            comment: input.comment,
        });

        setShowAdd(false);
    }

    function handleToggleAdd() {
        setShowAdd((current) => !current);
    }

    const suggestions = useMemo(
        () =>
            [...(suggestionsQuery.data ?? [])].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        [suggestionsQuery.data]
    );

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
                        href={routes.tools.root}
                        aria-label={t('backToTools')}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-base font-semibold text-ink">{t('title')}</h1>
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
            <div className="mb-4 flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={routes.tools.root}
                        aria-label={t('backToTools')}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-base font-semibold text-ink">{t('title')}</h1>
                </div>
                <button
                    onClick={handleToggleAdd}
                    aria-label={showAdd ? t('cancel') : t('suggestASong')}
                    className={
                        `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all ` +
                        (showAdd ? 'bg-surface-muted text-ink-muted' : 'bg-gradient-brand text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20')
                    }
                >
                    {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showAdd ? t('cancel') : t('suggest')}
                </button>
            </div>

            {showAdd && (
                <AddSongForm
                    isSubmitting={createSuggestion.isPending}
                    canSubmit={Boolean(memberId)}
                    onSubmit={handleCreateSuggestion}
                />
            )}

            <div className="flex flex-col gap-2.5">
                {suggestions.map((suggestion) => (
                    <PlaylistItemRow key={suggestion.id} suggestion={suggestion} />
                ))}
            </div>
        </div>
    );
}
