'use client';

import { LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
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
        <div className="mx-auto max-w-3xl pb-24 lg:pb-8">
            <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                        <h1 className="truncate text-xl font-bold text-ink">{t('rsvpOverview')}</h1>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted">{activeEvent.title}</p>
                </div>
                <Link
                    href={routes.auth.manage({ tab: 'rsvp' })}
                    className="hidden rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted/70 sm:inline-flex"
                >
                    {t('openDashboard')}
                </Link>
            </div>

            <RsvpTab t={t} members={members} rsvps={rsvps} />
        </div>
    );
}
