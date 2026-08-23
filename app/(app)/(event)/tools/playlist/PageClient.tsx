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

function PlaylistScreen({ activeEvent, eventId }: { activeEvent: EventDetailResponseDto; eventId: string }) {
    const data = usePlaylistPageData({ activeEvent, eventId });
    const t = useTranslations('PlaylistPage');

    if (data.isLoadingModules) {
        return <EventRouteSpinner />;
    }

    if (!data.playlistEnabled) {
        return (
            <PlaylistDisabledState
                backLabel={t('backToFeed')}
                body={data.playlistInRegistry && data.unlockPlanNames ? t('disabledUpgradeBody', { plans: data.unlockPlanNames }) : t('disabledBody')}
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
            onSuggest={data.onSuggest}
            suggestions={data.suggestions}
            suggestionsLoading={data.suggestionsLoading}
        />
    );
}
