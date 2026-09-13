'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useGalleryArchiveManifest } from '@/hooks/useGalleryArchive';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { useHostMenuItems, useToolsMenuItems } from '@/hooks/useToolsMenuItems';
import { useEventUsage } from '@/hooks/useUsage';
import { useWishbook } from '@/hooks/useWishbook';
import { findNextPlan, findPlanByCode } from '@/lib/planTiers';
import { findGalleryQrLink } from '@/lib/qrLinks';
import { useActiveEvent, useEventContextLoading, useIsHost } from '@/providers/EventProvider';

// Gathers everything RightContextPanel renders. Draft events hide every
// summary except plan usage — there's nothing to report yet (no RSVPs,
// media, or wishbook entries can exist before the event goes live).
export function useRightContextPanel() {
    const activeEvent = useActiveEvent();
    const isHost = useIsHost();
    const isLoading = useEventContextLoading();
    const { data: eventUsage = null } = useEventUsage(activeEvent?.id ?? null);
    const { data: appConfig } = useAppConfig();

    const isDraft = activeEvent?.status === 'DRAFT';
    const availableModuleKeys = new Set((activeEvent?.modules ?? []).filter((module) => module.isAvailable).map((module) => module.moduleKey));

    const showRsvpSummary = !isDraft && availableModuleKeys.has('rsvp');
    const showMediaSummary = !isDraft && availableModuleKeys.has('gallery');
    const showWishbookSummary = !isDraft && availableModuleKeys.has('wishbook');
    const showGalleryQr = !isDraft && availableModuleKeys.has('gallery');

    const galleryManifest = useGalleryArchiveManifest(activeEvent?.id ?? null, 'DISPLAY', showMediaSummary);
    const wishbook = useWishbook(showWishbookSummary ? (activeEvent?.id ?? null) : null);
    const galleryQrLinks = useEventQrLinks(showGalleryQr ? (activeEvent?.id ?? null) : null);

    // Same set the MobileTabBar's host context menu shows: dashboard + help,
    // plus every available tool except the guest self-RSVP flow (hosts answer
    // RSVPs from the dashboard's RSVP section, already linked in that menu).
    // The gallery QR link is excluded here — it gets its own section below,
    // between plan usage and the RSVP summary, instead of sitting in this flat list.
    const hostItemsForActions = useHostMenuItems().filter((item) => item.key !== 'galleryQr');
    const toolItems = useToolsMenuItems();
    const actionItems = isDraft
        ? hostItemsForActions.filter((item) => item.key !== 'help')
        : [...hostItemsForActions, ...toolItems.filter((item) => item.key !== 'rsvp')];

    const currentPlan = eventUsage ? findPlanByCode(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const nextPlan = eventUsage ? findNextPlan(appConfig?.planTiers ?? [], 'EVENT', eventUsage.planTier) : undefined;
    const globallyEnabledModules = (appConfig?.modules ?? []).filter((module_) => module_.isEnabled);
    const enabledModuleKeys = new Set(globallyEnabledModules.map((module_) => module_.moduleKey));
    const includedModuleKeys =
        currentPlan?.moduleKeys.filter((moduleKey) => enabledModuleKeys.has(moduleKey) && availableModuleKeys.has(moduleKey)) ?? [];

    return {
        visible: !isLoading && Boolean(activeEvent) && isHost,
        activeEvent,
        isDraft,
        eventUsage,
        currentPlan,
        nextPlan,
        includedModuleKeys,
        actionItems,
        showRsvpSummary,
        rsvpSummary: activeEvent?.rsvpSummary ?? null,
        showMediaSummary,
        mediaSummary: galleryManifest.data ?? null,
        showGalleryQr,
        galleryQrLink: findGalleryQrLink(galleryQrLinks.data ?? []),
        showWishbookSummary,
        wishbookEntries: wishbook.data?.pages[0]?.content.slice(0, 2) ?? [],
        wishbookTotal: wishbook.data?.pages[0]?.totalElements ?? 0,
    };
}
