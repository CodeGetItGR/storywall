'use client';

import { useEffect, useMemo, useState } from 'react';

import { DeletedEventManageScreen } from '@/components/manage/DeletedEventManageScreen';
import { InvitationTab } from '@/components/manage/invitation/InvitationTab';
import { ManageMembersSkeleton, ManageOverviewSkeleton, ManageRsvpSkeleton } from '@/components/manage/ManageSkeletons';
import { ManageShell } from '@/components/manage/nav/ManageShell';
import { ThemePicker } from '@/components/manage/ThemePicker';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useEventInvitations } from '@/hooks/useEventInvitations';
import { useEventMembers } from '@/hooks/useEventMembers';
import { useEventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import { useManageNav } from '@/hooks/useManageNav';
import { useManageSectionRoute } from '@/hooks/useManageSectionRoute';
import { useEventRsvps } from '@/hooks/useRsvps';
import { useEventUsage } from '@/hooks/useUsage';
import { countPendingCoHostInvitations } from '@/lib/eventInvitations';
import { isEventWritable } from '@/lib/eventLifecycle';
import { attendingGuestPeople } from '@/lib/rsvpGuests';

import BillingTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/BillingTab';
import DangerZoneTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/DangerZoneTab';
import GiftTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/GiftTab';
import MembersTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/MembersTab';
import OverviewTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab';
import RsvpTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/RsvpTab';
import SettingsTab from '../../app/(main)/(app)/(event)/events/[eventId]/manage/SettingsTab';

export function ManageScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const nav = useManageNav();
    const { isDraft, isDeleted, canDelete, rsvpAvailable, giftSection } = nav;
    const { section, navigateToSection, cancelledCheckout } = useManageSectionRoute({
        eventId,
        isDraft,
        isDeleted,
        visibleSections: nav.visibleSections,
        pendingSections: giftSection.isLoading ? ['gift'] : [],
    });
    const { data: appConfig } = useAppConfig();

    const canWrite = isEventWritable(activeEvent?.status);
    const canEditDetails = canWrite;
    // Deleted events are read-only: no roster, RSVPs, invitations or usage to load.
    const activeHostEventId = isHost && !isDraft && !isDeleted ? eventId : null;
    const { data: members = [], isLoading: membersLoading } = useEventMembers(activeHostEventId);
    const { data: rsvps = [], isLoading: rsvpsLoading } = useEventRsvps(rsvpAvailable ? activeHostEventId : null);
    const { data: invitations = [], isLoading: invitationsLoading } = useEventInvitations(activeHostEventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(isHost && !isDeleted ? eventId : null);
    const onlineInvitation = useEventOnlineInvitation(activeEvent, { enabled: section === 'invitation' });

    const overviewLoading = membersLoading || invitationsLoading || rsvpsLoading || usageLoading;
    const rsvpTabLoading = membersLoading || rsvpsLoading;
    const membersTabLoading = membersLoading || invitationsLoading || usageLoading;

    const [daysToGo, setDaysToGo] = useState(() =>
        Math.max(0, activeEvent ? Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0),
    );

    useEffect(() => {
        if (activeEvent) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDaysToGo(Math.max(0, Math.ceil((new Date(activeEvent.schedule.startAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
    }, [activeEvent]);

    // The overview's seats: people coming, counted like the RSVP report (guests
    // only, attending only), so the two never disagree.
    const seatsClaimed = useMemo(() => attendingGuestPeople(members, rsvps), [members, rsvps]);

    if (isDeleted) return <DeletedEventManageScreen event={activeEvent} />;

    const renderedSection = (
        <>
            {section === 'overview' &&
                (overviewLoading ? (
                    <ManageOverviewSkeleton />
                ) : (
                    <OverviewTab
                        event={activeEvent}
                        memberCount={members.length}
                        daysToGo={daysToGo}
                        pendingCoHostInvitationCount={countPendingCoHostInvitations(invitations)}
                        seatsClaimed={rsvpAvailable ? seatsClaimed : null}
                        eventUsage={eventUsage}
                        planTiers={appConfig?.planTiers ?? []}
                        paidServices={appConfig?.paidServices ?? []}
                        modules={appConfig?.modules ?? []}
                        eventModules={activeEvent.modules}
                        eventId={activeEvent.id}
                        eventTitle={activeEvent.title}
                        eventType={activeEvent.eventType}
                        eventStatus={activeEvent.status}
                        schedule={activeEvent.schedule}
                        cancelledCheckout={cancelledCheckout}
                        canPurchase={canDelete}
                    />
                ))}

            {section === 'rsvp' &&
                (rsvpTabLoading ? (
                    <ManageRsvpSkeleton />
                ) : (
                    <RsvpTab
                        eventId={eventId}
                        members={members}
                        rsvps={rsvps}
                        startAt={activeEvent.schedule.startAt}
                        rsvpDeadline={activeEvent.schedule.rsvpDeadline}
                        canWrite={canWrite}
                        origin="manage"
                    />
                ))}

            {section === 'members' &&
                (membersTabLoading ? (
                    <ManageMembersSkeleton />
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

            {section === 'theme' && <ThemePicker event={activeEvent} canWrite={canEditDetails} showHeading={false} />}

            {section === 'invitation' && <InvitationTab invitation={onlineInvitation} />}

            {section === 'gift' &&
                (giftSection.isLoading ? (
                    <ManageOverviewSkeleton />
                ) : (
                    <GiftTab
                        eventId={eventId}
                        gift={giftSection.gift}
                        canManage={canDelete && canWrite}
                        eventActive={activeEvent.status === 'ACTIVE'}
                    />
                ))}

            {section === 'danger' && <DangerZoneTab event={activeEvent} />}

            {section === 'billing' && <BillingTab eventId={eventId} schedule={activeEvent.schedule} canPurchase={canDelete} />}
        </>
    );

    return (
        <ManageShell nav={nav} active={section} onSelectSection={navigateToSection}>
            {renderedSection}
        </ManageShell>
    );
}
