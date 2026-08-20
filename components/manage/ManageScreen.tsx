'use client';

import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ManageSectionNav, sectionIcons } from '@/components/manage/ManageSectionNav';
import { Modal } from '@/components/ui/modal';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventQrLinks, useEventQrLinkStats } from '@/hooks/useQrLinks';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable } from '@/lib/eventLifecycle';
import { isBillingSection, type ManageSection, manageSectionGroups, parseManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

import BillingTab from '../../app/(app)/(event)/manage/BillingTab';
import InvitationsTab from '../../app/(app)/(event)/manage/InvitationsTab';
import OverviewTab from '../../app/(app)/(event)/manage/OverviewTab';
import RsvpTab from '../../app/(app)/(event)/manage/RsvpTab';
import SettingsTab from '../../app/(app)/(event)/manage/SettingsTab';

export function ManageScreen({ activeEvent, eventId, isHost }: { activeEvent: EventDetailResponseDto; eventId: string; isHost: boolean }) {
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedSection = parseManageSection(searchParams.get('tab'));
    const isDraft = activeEvent.status === 'DRAFT';
    const section = isDraft ? 'overview' : requestedSection;
    const [switcherOpen, setSwitcherOpen] = useState(false);

    const canWrite = isEventWritable(activeEvent?.status);
    const canEditDetails = canWrite;
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

    const navigateToSection = useCallback(
        (next: ManageSection) => {
            setSwitcherOpen(false);
            const nextParams = new URLSearchParams(searchParams.toString());
            if (next === 'overview') nextParams.delete('tab');
            else nextParams.set('tab', next);
            const query = nextParams.toString();
            router.replace(query ? `${routes.manage}?${query}` : routes.manage);
        },
        [router, searchParams]
    );

    const handleSeeAllRsvp = useCallback(() => {
        navigateToSection('rsvp');
    }, [navigateToSection]);

    const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
    const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
    }, [activeEvent]);

    useEffect(() => {
        if (isDraft && requestedSection !== section) router.replace(routes.manage);
    }, [isDraft, requestedSection, router, section]);

    const summary = activeEvent.rsvpSummary;
    const rsvpBreakdown = [
        { key: 'attending', count: summary.attending, color: 'bg-emerald-500' },
        { key: 'maybe', count: summary.maybe, color: 'bg-amber-400' },
        { key: 'declined', count: summary.declined, color: 'bg-rose-400' },
        { key: 'noResponse', count: summary.noResponse, color: 'bg-border' },
    ] as const;

    // Party sizes belong to the overview's headline numbers, so the RSVP roster
    // never restates a total that is already visible one section away.
    const seatsClaimed = useMemo(() => rsvps.reduce((sum, rsvp) => sum + rsvp.adultCount + rsvp.childCount, 0), [rsvps]);

    const activeGroup = manageSectionGroups.find((entry) => entry.sections.includes(section))?.group ?? 'event';
    const ActiveIcon = sectionIcons[section];

    const renderedSection = (
        <>
            {section === 'overview' && (
                <OverviewTab
                    memberCount={members.length}
                    daysToGo={daysToGo}
                    invitationCount={invitations.length}
                    seatsClaimed={seatsClaimed}
                    rsvpBreakdown={rsvpBreakdown}
                    eventUsage={eventUsage}
                    planTiers={appConfig?.planTiers ?? []}
                    paidServices={appConfig?.paidServices ?? []}
                    modules={appConfig?.modules ?? []}
                    eventModules={activeEvent.modules}
                    onSeeAllRsvp={handleSeeAllRsvp}
                    eventId={activeEvent.id}
                    eventStatus={activeEvent.status}
                    endAt={activeEvent.schedule.endAt}
                />
            )}

            {section === 'rsvp' && <RsvpTab members={members} rsvps={rsvps} />}

            {section === 'invitations' && eventId && (
                <InvitationsTab eventId={eventId} invitations={invitations} qrLinks={qrLinks} qrLinkStats={qrLinkStats} canWrite={canWrite} />
            )}

            {section === 'settings' && <SettingsTab event={activeEvent} canWrite={canEditDetails} canUploadCover={canWrite} />}

            {isBillingSection(section) && <BillingTab eventId={eventId} section={section} />}
        </>
    );

    return (
        <div className="mx-auto w-full max-w-6xl pb-28 lg:pb-10">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none">
                <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 lg:px-6 lg:pb-5 lg:pt-6">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                            <LayoutDashboard className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            {t('title')}
                        </p>
                        <h1 className="mt-0.5 truncate text-lg leading-tight font-bold text-ink sm:text-xl lg:text-2xl">{activeEvent.title}</h1>
                    </div>
                    <span
                        className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap',
                            eventStatusBadgeTone[activeEvent.status] ?? eventStatusBadgeTone.ACTIVE
                        )}
                    >
                        {t.has(`status.${activeEvent.status}`) ? t(`status.${activeEvent.status}`) : t('hostView')}
                    </span>
                </div>

                {/* Section switcher (small screens) */}
                {!isDraft && (
                    <div className="px-4 pb-3 lg:hidden">
                        <button
                            type="button"
                            onClick={openSwitcher}
                            aria-haspopup="dialog"
                            aria-expanded={switcherOpen}
                            className="flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-border bg-surface-muted px-3.5 text-left"
                        >
                            <ActiveIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.2} aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                                    {t(`groups.${activeGroup}`)}
                                </span>
                                <span className="block truncate text-sm font-bold text-ink">{t(`sections.${section}`)}</span>
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="px-4 pt-4 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-0">
                {/* Sections (desktop) */}
                {!isDraft && <ManageSectionNav active={section} onSelect={navigateToSection} className="sticky top-6 hidden self-start lg:flex" />}

                <div className={cn('min-w-0', isDraft && 'lg:col-span-2 lg:max-w-3xl')}>
                    {/* Section heading (desktop) */}
                    {!isDraft && (
                        <h2 className="mb-4 hidden text-sm font-bold uppercase tracking-wide text-ink-muted lg:block">{t(`sections.${section}`)}</h2>
                    )}
                    {renderedSection}
                </div>
            </div>

            {/* Section sheet (small screens) */}
            <Modal open={switcherOpen} onClose={closeSwitcher} variant="sheet" ariaLabel={t('sectionSwitcher')} closeLabel={t('sectionSwitcher')}>
                <Modal.Body className="px-3 pb-6 pt-5">
                    <ManageSectionNav active={section} onSelect={navigateToSection} />
                </Modal.Body>
            </Modal>
        </div>
    );
}
