'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import RsvpTab from '@/app/(app)/(event)/events/[eventId]/manage/RsvpTab';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
import { routes } from '@/lib/routes';

export function RsvpScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('ManagePage');

    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);
    const [daysToGo, setDaysToGo] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
    }, [activeEvent.schedule.startAt]);

    return (
        <ModulePageShell
            maxWidth="3xl"
            title={t('rsvpOverview')}
            icon={Users}
            iconClassName="text-emerald-500"
            backLabel={t('backToTools')}
            backHref={routes.events.feed(eventId)}
            subtitle={activeEvent.title}
        >
            <RsvpTab members={members} rsvps={rsvps} daysToGo={daysToGo} />
        </ModulePageShell>
    );
}
