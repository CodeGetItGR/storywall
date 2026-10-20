'use client';

import { ListMusic } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistLiveRow } from '@/components/playlist/live/PlaylistLiveRow';
import { PlaylistListSkeleton } from '@/components/playlist/PlaylistSkeletons';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { usePlaylistLive } from '@/hooks/usePlaylistLive';
import { routes } from '@/lib/routes';

export function PlaylistLiveScreen() {
    const t = useTranslations('Vendors');
    const tPlaylist = useTranslations('PlaylistPage');
    const { eventId } = useEventRouteContext();
    const live = usePlaylistLive(eventId);

    if (!live.isReadable) {
        return (
            <ModuleUnavailableState
                backHref={routes.events.feed(eventId)}
                backLabel={tPlaylist('backToFeed')}
                body={tPlaylist('disabledBody')}
                icon={ListMusic}
                iconClassName="text-violet-500"
                title={tPlaylist('disabledTitle')}
            />
        );
    }

    return (
        <ModulePageShell
            maxWidth="2xl"
            title={t('live.title')}
            icon={ListMusic}
            backLabel={t('live.back')}
            backHref={routes.events.tools.playlist(eventId)}
        >
            {/* Status */}
            {!live.canMark && <p className="mb-5 rounded-lg bg-surface-muted px-4 py-3 text-sm text-ink-muted">{t('live.notLive')}</p>}
            {live.error && (
                <p role="alert" className="mb-4 text-sm text-rose-600">
                    {live.error}
                </p>
            )}

            {/* Songs */}
            {live.isLoading ? (
                <PlaylistListSkeleton />
            ) : live.rows.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('live.empty')}</p>
            ) : (
                <ol className="divide-y divide-border">
                    {live.rows.map((row) => (
                        <PlaylistLiveRow
                            key={row.id}
                            row={row}
                            canMark={live.canMark}
                            isPending={live.pendingId === row.id}
                            onToggleAction={live.togglePlayed}
                        />
                    ))}
                </ol>
            )}
        </ModulePageShell>
    );
}
