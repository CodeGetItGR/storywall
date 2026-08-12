'use client';

import { LayoutDashboard, Settings, Ticket, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ElementType, useCallback, useEffect, useState } from 'react';

import { EventRouteGate } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

import InvitationsTab from './InvitationsTab';
import OverviewTab from './OverviewTab';
import RsvpTab from './RsvpTab';
import SettingsTab from './SettingsTab';

type ManageTab = 'overview' | 'rsvp' | 'invitations' | 'settings';

const tabItems: { key: ManageTab; icon: ElementType }[] = [
    { key: 'overview', icon: LayoutDashboard },
    { key: 'rsvp', icon: Users },
    { key: 'invitations', icon: Ticket },
    { key: 'settings', icon: Settings },
];

function ManageTabButton({
    tabKey,
    active,
    Icon,
    label,
    onSelect,
}: {
    tabKey: ManageTab;
    active: boolean;
    Icon: ElementType;
    label: string;
    onSelect: (tab: ManageTab) => void;
}) {
    const handleClick = useCallback(() => {
        onSelect(tabKey);
    }, [onSelect, tabKey]);

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-semibold transition-colors',
                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            {label}
        </button>
    );
}

export default function ManagePage() {
    return (
        <EventRouteGate requireHost missingEventRedirectTo={routes.welcome}>
            {(context) => <ManageScreen {...context} />}
        </EventRouteGate>
    );
}

function ManageScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const tab = tabParam === 'rsvp' || tabParam === 'invitations' || tabParam === 'settings' ? tabParam : 'overview';

    const canWrite = isEventWritable(activeEvent?.status);
    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);
    const { data: invitations = [] } = useEventInvitations(isHost ? eventId : null);
    const { data: qrLinks = [] } = useEventQrLinks(isHost ? eventId : null);
    const { data: eventUsage = null } = useEventUsage(isHost ? eventId : null);
    const { data: appConfig } = useAppConfig();

    const [daysToGo, setDaysToGo] = useState(() =>
        Math.max(0, activeEvent ? Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0)
    );

    const navigateToTab = useCallback(
        (nextTab: ManageTab) => {
            const nextParams = new URLSearchParams(searchParams.toString());
            if (nextTab === 'overview') nextParams.delete('tab');
            else nextParams.set('tab', nextTab);
            const query = nextParams.toString();
            router.replace(query ? `${routes.manage}?${query}` : routes.manage);
        },
        [router, searchParams]
    );

    const handleSeeAllRsvp = useCallback(() => {
        navigateToTab('rsvp');
    }, [navigateToTab]);

    const handleSeeAllInvitations = useCallback(() => {
        navigateToTab('invitations');
    }, [navigateToTab]);

    // Date.now() is impure, so this can't be computed directly during render
    // (react-hooks/purity) it must live in an effect.
    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
    }, [activeEvent]);

    const summary = activeEvent.rsvpSummary;

    const rsvpBreakdown = [
        { key: 'attending', count: summary.attending, color: 'bg-emerald-500' },
        { key: 'maybe', count: summary.maybe, color: 'bg-amber-400' },
        { key: 'declined', count: summary.declined, color: 'bg-rose-400' },
        { key: 'noResponse', count: summary.noResponse, color: 'bg-border' },
    ] as const;

    const renderedTab = (
        <>
            {tab === 'overview' && (
                <OverviewTab
                    t={t}
                    memberCount={members.length}
                    daysToGo={daysToGo}
                    invitationCount={invitations.length}
                    rsvpBreakdown={rsvpBreakdown}
                    eventUsage={eventUsage}
                    planTiers={appConfig?.planTiers ?? []}
                    modules={appConfig?.modules ?? []}
                    eventModules={activeEvent.modules}
                    onSeeAllRsvp={handleSeeAllRsvp}
                    onSeeAllInvitations={handleSeeAllInvitations}
                    eventId={activeEvent.id}
                    eventStatus={activeEvent.status}
                    endAt={activeEvent.schedule.endAt}
                />
            )}

            {tab === 'rsvp' && <RsvpTab t={t} members={members} rsvps={rsvps} />}

            {tab === 'invitations' && eventId && (
                <InvitationsTab t={t} eventId={eventId} invitations={invitations} qrLinks={qrLinks} canWrite={canWrite} />
            )}

            {tab === 'settings' && <SettingsTab t={t} event={activeEvent} canWrite={canWrite} />}
        </>
    );

    return (
        <div className="max-w-3xl mx-auto pb-28 lg:pb-8">
            <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            {t('title')}
                        </p>
                        <h1 className="mt-0.5 truncate text-lg font-bold leading-tight text-ink sm:text-xl">{activeEvent.title}</h1>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap',
                                eventStatusBadgeTone[activeEvent.status] ?? eventStatusBadgeTone.ACTIVE
                            )}
                        >
                            {t.has(`status.${activeEvent.status}`) ? t(`status.${activeEvent.status}`) : t('hostView')}
                        </span>
                    </div>
                </div>

                <div className="mx-4 mb-3 flex gap-1 rounded-full bg-surface-muted p-1">
                    {tabItems.map(({ key, icon: Icon }) => (
                        <ManageTabButton key={key} tabKey={key} active={tab === key} Icon={Icon} label={t(`tabs.${key}`)} onSelect={navigateToTab} />
                    ))}
                </div>
            </div>

            <div className="pt-4">{renderedTab}</div>
        </div>
    );
}
