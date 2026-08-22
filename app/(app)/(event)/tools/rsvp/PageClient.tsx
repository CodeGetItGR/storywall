'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

import RsvpTab from '../../manage/RsvpTab';

export default function RSVPPage() {
    return (
        <EventRouteGate requireHost guestRedirectTo={routes.tools.rsvpSubmit}>
            {(context) => <RsvpScreen {...context} />}
        </EventRouteGate>
    );
}

function RsvpScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
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
