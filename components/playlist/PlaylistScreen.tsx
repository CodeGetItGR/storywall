'use client';

import { useTranslations } from 'next-intl';

import { PlaylistContent } from '@/components/playlist/PlaylistContent';
import { PlaylistDisabledState } from '@/components/playlist/PlaylistDisabledState';
import { EventRouteSpinner, useEventRouteContext } from '@/components/routing/EventRouteGate';
import { usePlaylistPageData } from '@/hooks/usePlaylistPageData';
import { isEventWritable } from '@/lib/eventLifecycle';

export function PlaylistScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
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
