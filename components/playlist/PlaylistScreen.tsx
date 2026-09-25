'use client';

import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PlaylistContent } from '@/components/playlist/PlaylistContent';
import { EventRouteSpinner, useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { usePlaylistPageData } from '@/hooks/usePlaylistPageData';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

export function PlaylistScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const data = usePlaylistPageData({ activeEvent, eventId });
    const t = useTranslations('PlaylistPage');
    const upgradeHref = usePlanUpgradeHref(eventId);

    if (data.isLoadingModules) {
        return <EventRouteSpinner />;
    }

    if (!data.playlistEnabled) {
        return (
            <ModuleUnavailableState
                backHref={routes.events.feed(eventId)}
                backLabel={t('backToFeed')}
                body={data.playlistInRegistry && data.unlockPlanNames ? t('disabledUpgradeBody', { plans: data.unlockPlanNames }) : t('disabledBody')}
                icon={Music}
                iconClassName="text-violet-500"
                title={t('disabledTitle')}
                upgradeHref={data.playlistInRegistry ? upgradeHref : null}
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
