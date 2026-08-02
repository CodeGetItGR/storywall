'use client';

import { CalendarPlus, LayoutDashboard, Loader2, Settings, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ElementType, useEffect, useState } from 'react';

import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
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

export default function ManagePage() {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const [tab, setTab] = useState<ManageTab>('overview');

    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isContextLoading = useEventContextLoading();

    const eventId = activeEvent?.id ?? null;
    const { data: members = [] } = useEventMembers(isHost ? eventId : null);
    const { data: rsvps = [] } = useEventRsvps(isHost ? eventId : null);
    const { data: invitations = [] } = useEventInvitations(isHost ? eventId : null);

    const [daysToGo, setDaysToGo] = useState(() =>
        Math.max(0, activeEvent ? Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0)
    );

    // Date.now() is impure, so this can't be computed directly during render
    // (react-hooks/purity) — it must live in an effect.
    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(
                Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            );
        }
    }, [activeEvent]);

    // Host-only page — redirect once the event context has settled.
    useEffect(() => {
        if (isContextLoading) return;
        if (!eventId) {
            router.replace('/welcome');
            return;
        }
        if (!isHost) router.replace(`/feed/${eventId}`);
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
            {/* Header */}
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
                        href="/events/new"
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

            {/* Tab bar */}
            <div className="flex gap-1 bg-surface-muted rounded-full p-1 mx-4 mb-5">
                {tabItems.map(({ key, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-colors',
                            tab === key ? 'bg-card text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                        {t(`tabs.${key}`)}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <OverviewTab
                    t={t}
                    memberCount={members.length}
                    daysToGo={daysToGo}
                    invitationCount={invitations.length}
                    rsvpBreakdown={rsvpBreakdown}
                    onSeeAllRsvp={() => setTab('rsvp')}
                    onSeeAllInvitations={() => setTab('invitations')}
                />
            )}

            {tab === 'rsvp' && <RsvpTab t={t} members={members} rsvps={rsvps} />}

            {tab === 'invitations' && eventId && <InvitationsTab t={t} eventId={eventId} invitations={invitations} />}

            {tab === 'settings' && <SettingsTab t={t} event={activeEvent} />}
        </div>
    );
}
