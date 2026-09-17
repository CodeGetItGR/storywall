'use client';

import { ChevronDown, LayoutDashboard } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ManageSectionNav, sectionIcons } from '@/components/manage/ManageSectionNav';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/modal';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import { isEventWritable, isPrimaryHost } from '@/lib/eventLifecycle';
import { type ManageSection, manageSections, parseManageSection } from '@/lib/manageSections';
import { routes } from '@/lib/routes';
import { eventStatusBadgeTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';

import BillingTab from '../../app/(app)/(event)/events/[eventId]/manage/BillingTab';
import DangerZoneTab from '../../app/(app)/(event)/events/[eventId]/manage/DangerZoneTab';
import HelpTab from '../../app/(app)/(event)/events/[eventId]/manage/HelpTab';
import MembersTab from '../../app/(app)/(event)/events/[eventId]/manage/MembersTab';
import OverviewTab from '../../app/(app)/(event)/events/[eventId]/manage/OverviewTab';
import RsvpTab from '../../app/(app)/(event)/events/[eventId]/manage/RsvpTab';
import SettingsTab from '../../app/(app)/(event)/events/[eventId]/manage/SettingsTab';

export function ManageScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const t = useTranslations('ManagePage');
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedSection = parseManageSection(searchParams.get('tab'));
    const isDraft = activeEvent.status === 'DRAFT';
    const activeMember = useActiveMember();
    const canDelete = isPrimaryHost(activeEvent.hosts, activeMember?.id);
    const visibleSections = canDelete ? manageSections : manageSections.filter((entry) => entry !== 'danger');
    const section = isDraft ? 'overview' : visibleSections.includes(requestedSection) ? requestedSection : 'overview';
    const [switcherOpen, setSwitcherOpen] = useState(false);

    const canWrite = isEventWritable(activeEvent?.status);
    const canEditDetails = canWrite;
    const activeHostEventId = isHost && !isDraft ? eventId : null;
    const { data: members = [], isLoading: membersLoading } = useEventMembers(activeHostEventId);
    const { data: rsvps = [], isLoading: rsvpsLoading } = useEventRsvps(activeHostEventId);
    const { data: invitations = [], isLoading: invitationsLoading } = useEventInvitations(activeHostEventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(isHost ? eventId : null);
    const { data: appConfig } = useAppConfig();

    const overviewLoading = membersLoading || invitationsLoading || rsvpsLoading || usageLoading;
    const rsvpTabLoading = membersLoading || rsvpsLoading;
    const membersTabLoading = membersLoading || invitationsLoading || usageLoading;

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
            const manageRoot = routes.events.manage(eventId);
            router.replace(query ? `${manageRoot}?${query}` : manageRoot);
        },
        [eventId, router, searchParams]
    );

    const openSwitcher = useCallback(() => setSwitcherOpen(true), []);
    const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
    }, [activeEvent]);

    useEffect(() => {
        if (requestedSection !== section) router.replace(routes.events.manage(eventId));
    }, [eventId, requestedSection, router, section]);

    // Party sizes belong to the overview's headline numbers, so the RSVP roster
    // never restates a total that is already visible one section away.
    const seatsClaimed = useMemo(() => rsvps.reduce((sum, rsvp) => sum + rsvp.adultCount + rsvp.childCount, 0), [rsvps]);

    const ActiveIcon = sectionIcons[section];

    const renderedSection = (
        <>
            {section === 'overview' &&
                (overviewLoading ? (
                    <LoadingState size="md" className="min-h-64" />
                ) : (
                    <OverviewTab
                        memberCount={members.length}
                        daysToGo={daysToGo}
                        invitationCount={invitations.length}
                        seatsClaimed={seatsClaimed}
                        eventUsage={eventUsage}
                        planTiers={appConfig?.planTiers ?? []}
                        paidServices={appConfig?.paidServices ?? []}
                        modules={appConfig?.modules ?? []}
                        eventModules={activeEvent.modules}
                        eventId={activeEvent.id}
                        eventTitle={activeEvent.title}
                        eventType={activeEvent.eventType}
                        eventStatus={activeEvent.status}
                        startAt={activeEvent.schedule.startAt}
                    />
                ))}

            {section === 'rsvp' &&
                (rsvpTabLoading ? (
                    <LoadingState size="md" className="min-h-64" />
                ) : (
                    <RsvpTab
                        eventId={eventId}
                        members={members}
                        rsvps={rsvps}
                        startAt={activeEvent.schedule.startAt}
                        rsvpDeadline={activeEvent.schedule.rsvpDeadline}
                        canWrite={canWrite}
                    />
                ))}

            {section === 'members' &&
                (membersTabLoading ? (
                    <LoadingState size="md" className="min-h-64" />
                ) : (
                    <MembersTab
                        canModerate={canWrite}
                        isPrimaryHost={canDelete}
                        canWrite={canWrite}
                        eventId={eventId}
                        members={members}
                        invitations={invitations}
                        eventUsage={eventUsage}
                        planTiers={appConfig?.planTiers ?? []}
                        eventModules={activeEvent.modules}
                        hosts={activeEvent.hosts}
                    />
                ))}

            {section === 'settings' && <SettingsTab event={activeEvent} canWrite={canEditDetails} canUploadCover={canWrite} />}

            {section === 'help' && (
                <HelpTab
                    eventId={eventId}
                    eventTitle={activeEvent.title}
                    eventType={activeEvent.eventType}
                    schedule={activeEvent.schedule}
                    location={activeEvent.location}
                    sessions={activeEvent.sessions}
                    eventModules={activeEvent.modules}
                />
            )}

            {section === 'danger' && <DangerZoneTab event={activeEvent} />}

            {section === 'billing' && <BillingTab eventId={eventId} />}
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
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{t(`sections.${section}`)}</span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="px-4 pt-4 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:pt-5">
                {/* Sections (desktop) */}
                {!isDraft && (
                    <ManageSectionNav
                        active={section}
                        onSelectAction={navigateToSection}
                        visibleSections={visibleSections}
                        className="sticky top-6 hidden self-start lg:flex"
                    />
                )}

                <div
                    className={cn(
                        'min-w-0',
                        isDraft && 'flex min-h-[60svh] flex-col justify-center lg:col-span-2 lg:min-h-0 lg:max-w-4xl lg:justify-start'
                    )}
                >
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
                    <ManageSectionNav active={section} onSelectAction={navigateToSection} visibleSections={visibleSections} />
                </Modal.Body>
            </Modal>
        </div>
    );
}
