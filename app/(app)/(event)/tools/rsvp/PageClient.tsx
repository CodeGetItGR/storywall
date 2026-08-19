'use client';

import { Users } from 'lucide-react';
import Link from 'next/link';
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

    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);

    return (
        <ModulePageShell
            maxWidth="3xl"
            title={t('rsvpOverview')}
            icon={Users}
            iconClassName="text-emerald-500"
            backLabel={t('backToTools')}
            backHref={routes.tools.root}
            subtitle={activeEvent.title}
            action={
                <Link
                    href={routes.auth.manage({ tab: 'rsvp' })}
                    className="hidden rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted/70 sm:inline-flex"
                >
                    {t('openDashboard')}
                </Link>
            }
        >
            <RsvpTab members={members} rsvps={rsvps} />
        </ModulePageShell>
    );
}
