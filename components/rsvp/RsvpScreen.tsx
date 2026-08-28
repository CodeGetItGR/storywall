'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import RsvpTab from '@/app/(app)/(event)/events/[eventId]/manage/RsvpTab';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';

export function RsvpScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('ManagePage');
    const router = useRouter();

    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);

    return (
        <ModulePageShell
            maxWidth="3xl"
            title={t('rsvpOverview')}
            icon={Users}
            iconClassName="text-emerald-500"
            backLabel={t('backToTools')}
            onBack={router.back}
            subtitle={activeEvent.title}
        >
            <RsvpTab members={members} rsvps={rsvps} />
        </ModulePageShell>
    );
}
