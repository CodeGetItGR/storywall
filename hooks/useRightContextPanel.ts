'use client';

import { Music4 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpgradeOptions } from '@/hooks/useBilling';
import { useGalleryArchiveManifest } from '@/hooks/useGalleryArchive';
import { useIsPrimaryHost } from '@/hooks/useIsPrimaryHost';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { type ToolMenuItem, useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { useEventUsage } from '@/hooks/useUsage';
import { useWishbook } from '@/hooks/useWishbook';
import { isEventDeleted } from '@/lib/eventLifecycle';
import { findPlanByCode } from '@/lib/planTiers';
import { findGalleryQrLink, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// Gathers everything RightContextPanel renders. Draft events hide every
// summary except plan usage — there's nothing to report yet (no RSVPs,
// media, or wishbook entries can exist before the event goes live). For
// non-host members the panel only ever shows their plain tool links (same
// set MobileTabBar's member context menu shows), so every host-only
// summary/fetch below is also gated on `isHost`.
export function useRightContextPanel({ includeManageLinks = true }: { includeManageLinks?: boolean } = {}) {
    const tTools = useTranslations('ToolsMenu');
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isPrimaryHost = useIsPrimaryHost();
    const isLoading = useEventContextLoading();
    // Deleted events keep no plan, no upgrade path and no live counts —
    // every summary below is a write surface or a number that can't change.
    const isDeleted = isEventDeleted(activeEvent);
    const { data: eventUsage = null } = useEventUsage(isHost && !isDeleted ? (activeEvent?.id ?? null) : null);
    const { data: appConfig } = useAppConfig();

    const isDraft = activeEvent?.status === 'DRAFT';
    // Only the main host may list upgrades; the server answers 4006 to anyone else.
    const { data: upgradeOptions = [] } = useUpgradeOptions(isPrimaryHost && !isDeleted ? (activeEvent?.id ?? null) : null, !isDraft);
    const availableModuleKeys = new Set((activeEvent?.modules ?? []).filter((module) => module.isAvailable).map((module) => module.moduleKey));

    const isLiveHost = isHost && !isDraft && !isDeleted;
    const showRsvpSummary = isLiveHost && availableModuleKeys.has('rsvp');
    const showMediaSummary = isLiveHost && availableModuleKeys.has('gallery');
    const showWishbookSummary = isLiveHost && availableModuleKeys.has('wishbook');
    const showGalleryQr = isLiveHost && isGalleryQrFeatureEnabled(activeEvent?.modules);
    const showInvitationsQr = isLiveHost;

    const galleryManifest = useGalleryArchiveManifest(activeEvent?.id ?? null, 'DISPLAY', showMediaSummary);
    const wishbook = useWishbook(showWishbookSummary ? (activeEvent?.id ?? null) : null);
    const qrLinks = useEventQrLinks(showGalleryQr || showInvitationsQr ? (activeEvent?.id ?? null) : null);

    // Same set the MobileTabBar's host context menu shows: dashboard + help,
    // plus every available tool except the guest self-RSVP flow (hosts answer
    // RSVPs from the dashboard's RSVP section, already linked in that menu).
    // The gallery QR and invitations QR links are excluded here — they get
    // their own combined section below, between plan usage and the RSVP
    // summary, instead of sitting in this flat list.
    // `includeManageLinks: false` (used when this content is reused inside the
    // manage page itself, e.g. its Overview tab) drops "Manage" (would self-link
    // to the dashboard) and "Help" (already one click away in the manage nav).
    let hostItemsForActions = useHostMenuItems().filter((item) => item.key !== 'galleryQr' && item.key !== 'invitationsQr');
    if (!includeManageLinks) hostItemsForActions = hostItemsForActions.filter((item) => item.key !== 'manage' && item.key !== 'help');
    const toolItems = useToolsMenuItems();
    // The shared tools menu leaves the playlist out because MobileTabBar gives
    // it its own tab; the desktop host actions have no such tab, so add it here.
    const playlistItems: ToolMenuItem[] =
        isLiveHost && activeEvent && availableModuleKeys.has('playlist')
            ? [
                  {
                      key: 'playlist',
                      href: routes.events.tools.playlist(activeEvent.id),
                      icon: Music4,
                      label: tTools('items.playlist.label'),
                      description: tTools('items.playlist.description'),
                  },
              ]
            : [];
    const actionItems = !isHost
        ? toolItems
        : isDraft
          ? hostItemsForActions.filter((item) => item.key !== 'help')
          : [...hostItemsForActions, ...toolItems.filter((item) => item.key !== 'rsvp'), ...playlistItems];

    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextUpgradeOption = upgradeOptions[0];
    const globallyEnabledModules = (appConfig?.modules ?? []).filter((module_) => module_.isEnabled);
    const enabledModuleKeys = new Set(globallyEnabledModules.map((module_) => module_.moduleKey));
    const includedModuleKeys =
        currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [];

    return {
        visible: !isLoading && Boolean(activeEvent) && (isHost || actionItems.length > 0),
        isHost,
        activeEvent,
        isDraft,
        eventUsage,
        currentPlan,
        nextUpgradeOption,
        includedModuleKeys,
        actionItems,
        showRsvpSummary,
        rsvpSummary: activeEvent?.rsvpSummary ?? null,
        showMediaSummary,
        mediaSummary: galleryManifest.data ?? null,
        showGalleryQr,
        galleryQrLink: findGalleryQrLink(qrLinks.data ?? []),
        showInvitationsQr,
        invitationsQrCount: (qrLinks.data ?? []).filter((link) => link.targetType !== 'MEDIA_UPLOAD' && link.status !== 'REVOKED').length,
        showWishbookSummary,
        wishbookEntries: wishbook.data?.pages[0]?.content.slice(0, 2) ?? [],
        wishbookTotal: wishbook.data?.pages[0]?.page.totalElements ?? 0,
    };
}

export type UseRightContextPanelResult = ReturnType<typeof useRightContextPanel>;
