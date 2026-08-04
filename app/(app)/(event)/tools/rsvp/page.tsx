'use client';

import { LayoutDashboard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

import RsvpTab from '../../manage/RsvpTab';

export default function RSVPPage() {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();
    const eventId = activeEvent?.id ?? null;

    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);

    useEffect(() => {
        if (isContextLoading) {
            return;
        }

        if (!eventId) {
            router.replace(routes.welcome);
            return;
        }

        if (!isHost) {
            router.replace(routes.tools.rsvpSubmit);
        }
    }, [eventId, isContextLoading, isHost, router]);

    if (isContextLoading || !activeEvent || !isHost) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
            </div>
        );
    }

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
