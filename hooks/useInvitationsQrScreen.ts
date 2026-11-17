'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useEventOnlineInvitation } from '@/hooks/useEventOnlineInvitation';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useEventQrLinks, useEventQrLinkStats } from '@/hooks/useQrLinks';
import { useEventUsage } from '@/hooks/useUsage';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { saveMyDateAddon } from '@/lib/featureAddons';
import { offersOnlineInvitation } from '@/lib/invitation/invitationEvent';
import { guestChoiceRows } from '@/lib/invitationsQr';
import { findPlanByCode } from '@/lib/planTiers';
import { isGalleryQrFeatureEnabled, isInvitationQrLink } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';

// Everything Invitations & QR codes shows, for a host or a planner (QR_READ).
export function useInvitationsQrScreen() {
    const { activeEvent, eventId, isHost } = useEventRouteContext();
    // A planner (QR_READ) sees the links only: stats, usage, upgrades and edits stay with hosts.
    const hostEventId = isHost ? eventId : null;
    const { data: qrLinks = [], isLoading: qrLinksLoading } = useEventQrLinks(eventId);
    const { data: qrLinkStats = [], isLoading: statsLoading } = useEventQrLinkStats(hostEventId);
    const { data: eventUsage = null, isLoading: usageLoading } = useEventUsage(hostEventId);
    const isPrimaryHost = useIsPrimaryHost();
    const { data: upgradeOptions = [], isLoading: upgradesLoading } = useUpgradeOptions(eventId, isHost && isPrimaryHost);
    const { data: appConfig } = useAppConfig();
    // The invitation row needs the host's drafts, so a planner never asks for them.
    const showInvitation = isHost && offersOnlineInvitation(activeEvent.eventType);
    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    // The invitation sold as an add-on on this plan, offered next to the upgrade (KAN-82).
    const invitationAddOn = saveMyDateAddon(appConfig?.paidServices ?? [], appConfig?.modules ?? [], currentPlan);
    const invitation = useEventOnlineInvitation(activeEvent, { enabled: showInvitation, addOn: invitationAddOn });

    const isWritable = isEventWritable(activeEvent?.status);
    const canWrite = isHost && isWritable;
    const memberLimit = eventUsage?.memberLimit ?? null;
    const memberCount = eventUsage?.memberCount ?? 0;
    const isFull = memberLimit !== null && memberCount >= memberLimit;
    const nextUpgradeOption = upgradeOptions[0];
    const isLoading = qrLinksLoading || statsLoading || usageLoading || upgradesLoading || (showInvitation && invitation.isLoading);
    // The gallery upload code isn't listed: scanning the join code offers uploading too (KAN-208).
    // The guest code lives on a lite event's home. Both are left out of this list and its count.
    const shareQrLinks = qrLinks.filter(isInvitationQrLink);
    const rows = guestChoiceRows({
        showInvitation,
        // The join code also uploads when the plan has photo uploads (KAN-208).
        uploads: isGalleryQrFeatureEnabled(activeEvent.modules),
        wishes: isModuleAvailable(activeEvent.modules, 'wishbook'),
    });

    return {
        eventId,
        isHost,
        isWritable,
        canWrite,
        isLoading,
        eventUsage,
        memberCount,
        memberLimit,
        // Only read with eventUsage: the capacity panel shows when usage exists.
        currentPlanName: currentPlan?.name ?? eventUsage?.planTier ?? '',
        nextPlanName: isFull ? nextUpgradeOption?.planTierName : undefined,
        upgradeHref: routes.events.manage(eventId, { tab: 'billing' }),
        qrLinkStats,
        shareQrLinks,
        invitation,
        rows,
        eventTitle: activeEvent.title,
    };
}

export type InvitationsQrScreenState = ReturnType<typeof useInvitationsQrScreen>;
