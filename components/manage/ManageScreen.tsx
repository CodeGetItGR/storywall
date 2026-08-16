'use client';

import { LayoutDashboard, Settings, Ticket, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ElementType } from 'react';
import { useCallback, useEffect, useState } from 'react';

import { type ManageTab, ManageTabButton } from '@/components/manage/ManageTabButton';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventQrLinks, useEventQrLinkStats } from '@/hooks/useQrLinks';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

import InvitationsTab from '../../app/(app)/(event)/manage/InvitationsTab';
import OverviewTab from '../../app/(app)/(event)/manage/OverviewTab';
import RsvpTab from '../../app/(app)/(event)/manage/RsvpTab';
import SettingsTab from '../../app/(app)/(event)/manage/SettingsTab';

const tabItems: { key: ManageTab; icon: ElementType }[] = [
    { key: 'overview', icon: LayoutDashboard },
    { key: 'rsvp', icon: Users },
    { key: 'invitations', icon: Ticket },
    { key: 'settings', icon: Settings },
];

export function ManageScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const requestedTab = tabParam === 'rsvp' || tabParam === 'invitations' || tabParam === 'settings' ? tabParam : 'overview';
    const isDraft = activeEvent.status === 'DRAFT';
    const tab = isDraft && (requestedTab === 'rsvp' || requestedTab === 'invitations') ? 'overview' : requestedTab;

    const canWrite = isEventWritable(activeEvent?.status);
    const canEditDetails = canWrite || isDraft;
    const activeHostEventId = isHost && !isDraft ? eventId : null;
    const { data: members = [] } = useEventMembers(activeHostEventId);
    const { data: rsvps = [] } = useEventRsvps(activeHostEventId);
    const { data: invitations = [] } = useEventInvitations(activeHostEventId);
    const { data: qrLinks = [] } = useEventQrLinks(activeHostEventId);
    const { data: qrLinkStats = [] } = useEventQrLinkStats(activeHostEventId);
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

    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
    }, [activeEvent]);

    useEffect(() => {
        if (isDraft && requestedTab !== tab) router.replace(routes.manage);
    }, [isDraft, requestedTab, router, tab]);

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
                    memberCount={members.length}
                    daysToGo={daysToGo}
                    invitationCount={invitations.length}
                    rsvpBreakdown={rsvpBreakdown}
                    eventUsage={eventUsage}
                    planTiers={appConfig?.planTiers ?? []}
                    paidServices={appConfig?.paidServices ?? []}
                    modules={appConfig?.modules ?? []}
                    eventModules={activeEvent.modules}
                    onSeeAllRsvp={handleSeeAllRsvp}
                    onSeeAllInvitations={handleSeeAllInvitations}
                    eventId={activeEvent.id}
                    eventStatus={activeEvent.status}
                    endAt={activeEvent.schedule.endAt}
                />
            )}

            {tab === 'rsvp' && <RsvpTab members={members} rsvps={rsvps} />}

            {tab === 'invitations' && eventId && (
                <InvitationsTab eventId={eventId} invitations={invitations} qrLinks={qrLinks} qrLinkStats={qrLinkStats} canWrite={canWrite} />
            )}

            {tab === 'settings' && <SettingsTab event={activeEvent} canWrite={canEditDetails} canUploadCover={canWrite} />}
        </>
    );

    return (
        <div className="mx-auto max-w-3xl pb-28 lg:pb-8">
            <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
                <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            {t('title')}
                        </p>
                        <h1 className="mt-0.5 truncate text-lg leading-tight font-bold text-ink sm:text-xl">{activeEvent.title}</h1>
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

                <div className="mx-4 mb-3 hidden gap-1 rounded-full bg-surface-muted p-1 md:flex">
                    {tabItems
                        .filter(({ key }) => !isDraft || key === 'overview' || key === 'settings')
                        .map(({ key, icon: Icon }) => (
                            <ManageTabButton
                                key={key}
                                tabKey={key}
                                active={tab === key}
                                Icon={Icon}
                                label={t(`tabs.${key}`)}
                                onSelect={navigateToTab}
                            />
                        ))}
                </div>
            </div>

            <div className="pt-4">{renderedTab}</div>
        </div>
    );
}
