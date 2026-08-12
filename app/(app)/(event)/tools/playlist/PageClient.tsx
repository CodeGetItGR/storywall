'use client';

import { useTranslations } from 'next-intl';

import { PlaylistContent, PlaylistDisabledState } from '@/components/playlist';
import { EventRouteGate, EventRouteSpinner } from '@/components/routing/EventRouteGate';
import { usePlaylistPageData } from '@/hooks/usePlaylistPageData';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';

export default function PlaylistPage() {
    return <EventRouteGate>{(context) => <PlaylistScreen {...context} />}</EventRouteGate>;
}

function PlaylistScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const data = usePlaylistPageData({ activeEvent, eventId, isHost });
    const t = useTranslations('PlaylistPage');

    if (data.isLoadingModules) {
        return <EventRouteSpinner />;
    }

    if (!data.playlistEnabled) {
        return (
            <PlaylistDisabledState
                backLabel={t('backToFeed')}
                body={
                    data.playlistInRegistry && data.unlockPlanNames
                        ? t('disabledUpgradeBody', { plans: data.unlockPlanNames })
                        : t('disabledBody')
                }
                eventId={eventId}
                title={t('disabledTitle')}
            />
        );
    }

    return (
        <PlaylistContent
            canSuggest={data.canSuggest}
            eventId={eventId}
            isEventWritable={isEventWritable(activeEvent.status)}
            isHost={isHost}
            isLoadingLeaderboard={data.isLoadingLeaderboard}
            leaderboard={data.leaderboard}
            onSuggest={data.onSuggest}
            suggestions={data.suggestions}
            suggestionsLoading={data.suggestionsLoading}
        />
    );
}
