'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useGiftSection } from '@/hooks/useGiftSection';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { isEventDeleted, isModuleAvailable, isPrimaryHost, readableModuleKeys } from '@/lib/eventLifecycle';
import { canPickTheme } from '@/lib/eventTheme';
import { visibleManageNav, visibleManageSections } from '@/lib/manageSections';
import { useActiveMember } from '@/providers/EventProvider';

/** What the host's dashboard nav shows for this event, shared by every dashboard page. */
export function useManageNav() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    const activeMember = useActiveMember();
    const { data: appConfig } = useAppConfig();
    const isDraft = activeEvent.status === 'DRAFT';
    const isDeleted = isEventDeleted(activeEvent);
    const canDelete = isPrimaryHost(activeEvent.hosts, activeMember?.id);
    const rsvpAvailable = isModuleAvailable(activeEvent.modules, 'rsvp');
    const capabilities = eventCapabilities(activeEvent);
    const takesGuests = capabilities?.takesGuests ?? true;
    const showsShareLinks = capabilities?.showsShareLinks ?? true;
    const giftSection = useGiftSection(isHost && !isDraft && !isDeleted ? eventId : null, {
        isPrimaryHost: canDelete,
        eventModules: activeEvent.modules,
        planTiers: appConfig?.planTiers ?? [],
    });
    const visibleSections = visibleManageSections({
        canDelete,
        rsvpAvailable,
        giftAvailable: giftSection.available,
        themeAvailable: canPickTheme(activeEvent),
        // A lite event takes no guests, so its Members tab is only for co-hosts, when its plan has them.
        membersAvailable: takesGuests || isModuleAvailable(activeEvent.modules, 'co_hosts'),
    });
    // The same rules as the event menu's Invitations & QR codes and Vendors entries (useHostMenuItems).
    const { groups, showDanger } = visibleManageNav(visibleSections, {
        invitationsQr: !isDeleted && !isDraft && showsShareLinks,
        vendors: !isDeleted && !isDraft && readableModuleKeys(activeEvent).has('vendors'),
    });

    return { eventId, isDraft, isDeleted, canDelete, rsvpAvailable, giftSection, visibleSections, groups, showDanger };
}

export type ManageNav = ReturnType<typeof useManageNav>;
