'use client';

import { useTranslations } from 'next-intl';

import RsvpTab from '@/app/(main)/(app)/(event)/events/[eventId]/manage/RsvpTab';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { RsvpUnavailableState } from '@/components/rsvp/RsvpUnavailableState';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useRsvpAvailability } from '@/hooks/useRsvpAvailability';
import { useEventRsvps } from '@/hooks/useRsvps';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';

export function RsvpScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('ManagePage');
    const canWrite = isEventWritable(activeEvent?.status);
    const rsvp = useRsvpAvailability();
    const rosterEventId = isHost && rsvp.isAvailable ? eventId : null;

    const { data: members = [] } = useEventMembers(rosterEventId);
    const { data: rsvps = [] } = useEventRsvps(rosterEventId);

    if (!rsvp.isAvailable) {
        return <RsvpUnavailableState eventId={eventId} title={rsvp.unavailableTitle} body={rsvp.unavailableBody} />;
    }

    return (
        <ModulePageShell
            maxWidth="3xl"
            title={t('rsvpOverview')}
            iconClassName="text-emerald-500"
            backLabel={t('backToTools')}
            backHref={routes.events.feed(eventId)}
        >
            <RsvpTab
                eventId={eventId}
                members={members}
                rsvps={rsvps}
                startAt={activeEvent.schedule.startAt}
                rsvpDeadline={activeEvent.schedule.rsvpDeadline}
                canWrite={canWrite}
                origin="tools"
            />
        </ModulePageShell>
    );
}
