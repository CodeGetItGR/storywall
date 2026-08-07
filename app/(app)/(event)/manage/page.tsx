'use client';

import { CalendarPlus, LayoutDashboard, Loader2, Settings, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ElementType, useCallback, useEffect, useState } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import { isEventWritable } from '@/lib/eventLifecycle';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

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
            className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors',
                active ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
        >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            {label}
        </button>
    );
}

export default function ManagePage() {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const tab = tabParam === 'rsvp' || tabParam === 'invitations' || tabParam === 'settings' ? tabParam : 'overview';

    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();

    const eventId = activeEvent?.id ?? null;
    const canWrite = isEventWritable(activeEvent?.status);
    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);
    const { data: invitations = [] } = useEventInvitations(isHost ? eventId : null);
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

    // Host-only page. Redirect once the event context has settled.
    useEffect(() => {
        if (isContextLoading) return;
        if (!eventId) {
            router.replace(routes.welcome);
            return;
        }
        if (!isHost) router.replace(routes.post.feed(eventId));
    }, [isContextLoading, eventId, isHost, router]);

    if (isContextLoading || !activeEvent || !isHost) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-6 h-6 animate-spin text-ink-muted" />
            </div>
        );
    }

    const summary = activeEvent.rsvpSummary;

    const rsvpBreakdown = [
        { key: 'attending', count: summary.attending, color: 'bg-emerald-500' },
        { key: 'maybe', count: summary.maybe, color: 'bg-amber-400' },
        { key: 'declined', count: summary.declined, color: 'bg-rose-400' },
        { key: 'noResponse', count: summary.noResponse, color: 'bg-border' },
    ] as const;

    return (
        <div className="max-w-3xl mx-auto pb-24 lg:pb-8">
            <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-bold text-ink truncate">{t('title')}</h1>
                    </div>
                    <p className="text-xs text-ink-muted truncate">{activeEvent.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href={routes.events.new}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted text-ink text-xs font-semibold hover:bg-surface-muted/70 transition-colors"
                    >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        {t('newEvent')}
                    </Link>
                    <span className="px-3 py-1 rounded-full bg-primary-light text-primary-dark text-xs font-bold whitespace-nowrap">
                        {t('hostView')}
                    </span>
                </div>
            </div>

            <div className="flex gap-1 bg-surface-muted rounded-full p-1 mx-4 mb-5">
                {tabItems.map(({ key, icon: Icon }) => (
                    <ManageTabButton key={key} tabKey={key} active={tab === key} Icon={Icon} label={t(`tabs.${key}`)} onSelect={navigateToTab} />
                ))}
            </div>

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
                    onSeeAllRsvp={handleSeeAllRsvp}
                    onSeeAllInvitations={handleSeeAllInvitations}
                    eventId={activeEvent.id}
                    eventStatus={activeEvent.status}
                    endAt={activeEvent.schedule.endAt}
                />
            )}

            {tab === 'rsvp' && <RsvpTab t={t} members={members} rsvps={rsvps} />}

            {tab === 'invitations' && eventId && <InvitationsTab t={t} eventId={eventId} invitations={invitations} canWrite={canWrite} />}

            {tab === 'settings' && <SettingsTab t={t} event={activeEvent} canWrite={canWrite} />}
        </div>
    );
}
