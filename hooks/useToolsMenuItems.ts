'use client';

import {
    Baby,
    BookHeart,
    BriefcaseBusiness,
    CalendarCheck,
    CalendarDays,
    ClipboardList,
    Gift,
    HelpCircle,
    Images,
    LayoutDashboard,
    ListMusic,
    type LucideIcon,
    Megaphone,
    MessageCircleQuestion,
    QrCode,
    Store,
    Ticket,
    UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useEventVendors, useMyVendorRole } from '@/hooks/useVendors';
import { isEventDeleted, readableModuleKeys } from '@/lib/eventLifecycle';
import { canEditOwnRole, ROLE_SHEET_VALUE } from '@/lib/memberRoles';
import { isGalleryOpenToGuests, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
import { hasVendorCapability, listedVendors } from '@/lib/vendors';
import { useActiveEvent, useActiveMember, useContentAccessMode, useIsHost, useRouteEventId } from '@/providers/EventProvider';

export interface ToolMenuItem {
    key: string;
    href: string;
    icon: LucideIcon;
    label: string;
    description: string;
}

/** Only the tools whose backing module is actually available for the active event, plus the always-on schedule. */
export function useToolsMenuItems(): ToolMenuItem[] {
    const t = useTranslations('ToolsMenu');
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const isHost = useIsHost();
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    // Only read the gift account on event routes — id-less pages like /home
    // still show the menu for the remembered event but must not fire
    // event-scoped requests for it.
    const routeEventId = useRouteEventId();
    const giftAccount = useGiftAccount(routeEventId);
    // A host is never a vendor, so the host skips the role request.
    const vendorRole = useMyVendorRole(isHost ? null : routeEventId);
    const vendorList = useEventVendors(routeEventId);
    const availableModules = readableModuleKeys(activeEvent);
    const moduleCopy = useModuleCopy(activeEvent?.eventType);

    // A suspended StoryWall shows only the suspended view: no tool menu.
    if (!activeEvent || activeEvent.suspended) return [];

    // A deleted event is download-only: the gallery archive and the wishbook
    // PDF are the only tools that still do anything.
    const isDeleted = isEventDeleted(activeEvent);

    const vendorsOn = availableModules.has('vendors');
    const me = vendorsOn ? (vendorRole.data ?? null) : null;
    const hasVendorsListed = vendorsOn && listedVendors(vendorList.data ?? []).length > 0;

    // copyKey: the module whose event-type name and description label the tool.
    const toolDefinitions: { key: string; href: string; icon: LucideIcon; moduleKey?: string; copyKey?: string }[] = [
        { key: 'rsvp', href: routes.events.tools.rsvpSubmit(activeEvent.id), icon: CalendarCheck, moduleKey: 'rsvp' },
        // Always on, so not filtered by availability; copyKey still names it.
        { key: 'schedule', href: routes.events.tools.schedule(activeEvent.id), icon: CalendarDays, copyKey: 'schedule' },
        { key: 'gallery', href: routes.events.tools.gallery(activeEvent.id), icon: Images, moduleKey: 'gallery' },
        { key: 'wishbook', href: routes.events.tools.wishbook(activeEvent.id), icon: BookHeart, moduleKey: 'wishbook' },
        { key: 'gifts', href: routes.events.tools.gifts(activeEvent.id), icon: Gift, moduleKey: 'wishlist' },
        // Not for demo visitors: the public demo's mock backend has no Boy or Girl? handlers (v1).
        { key: 'heOrShe', href: routes.events.tools.heOrShe(activeEvent.id), icon: Baby, moduleKey: 'he_or_she' },
        // Not for demo visitors either: no mock handlers for Quiz & Polls.
        { key: 'quizPolls', href: routes.events.tools.quiz(activeEvent.id), icon: MessageCircleQuestion, moduleKey: 'quiz_polls' },
        { key: 'myRole', href: routes.events.feed(activeEvent.id, { sheet: ROLE_SHEET_VALUE }), icon: UserRound, moduleKey: 'member_roles' },
        // Vendors in the event (vendors spec 2026-10-19). Copy comes from ToolsMenu.items.
        { key: 'vendors', href: routes.events.tools.vendors(activeEvent.id), icon: Store },
        { key: 'vendorMe', href: routes.events.tools.vendorMe(activeEvent.id), icon: BriefcaseBusiness },
        { key: 'announcement', href: routes.events.tools.announcement(activeEvent.id), icon: Megaphone },
        { key: 'rsvpReport', href: routes.events.rsvpReport(activeEvent.id, 'FULL_LIST', 'vendor'), icon: ClipboardList },
        { key: 'vendorQr', href: routes.events.invitationsQr(activeEvent.id), icon: QrCode },
        { key: 'liveRequests', href: routes.events.tools.playlistLive(activeEvent.id), icon: ListMusic },
    ];

    return toolDefinitions
        .filter((tool) => !tool.moduleKey || availableModules.has(tool.moduleKey))
        .filter((tool) => tool.key !== 'gallery' || isHost || isGalleryOpenToGuests(activeEvent))
        .filter((tool) => tool.key !== 'gifts' || isHost || Boolean(giftAccount.data))
        .filter((tool) => tool.key !== 'myRole' || (!isDemoVisitor && canEditOwnRole(activeEvent, activeMember)))
        .filter((tool) => (tool.key !== 'heOrShe' && tool.key !== 'quizPolls') || !isDemoVisitor)
        .filter((tool) => tool.key !== 'vendors' || hasVendorsListed)
        .filter((tool) => tool.key !== 'vendorMe' || me !== null)
        .filter((tool) => tool.key !== 'announcement' || hasVendorCapability(me, 'ANNOUNCE'))
        .filter((tool) => tool.key !== 'rsvpReport' || hasVendorCapability(me, 'RSVP_REPORT'))
        .filter((tool) => tool.key !== 'vendorQr' || hasVendorCapability(me, 'QR_READ'))
        .filter((tool) => tool.key !== 'liveRequests' || hasVendorCapability(me, 'SONG_REQUESTS'))
        .filter((tool) => !isDeleted || tool.key === 'gallery' || tool.key === 'wishbook')
        .map((tool) => {
            const copyKey = tool.copyKey ?? tool.moduleKey;
            const copy = copyKey && copyKey !== 'member_roles' ? moduleCopy(copyKey) : null;
            return {
                key: tool.key,
                href: tool.href,
                icon: tool.icon,
                label: copy?.name ?? t(`items.${tool.key}.label`),
                description: copy?.description ?? t(`items.${tool.key}.description`),
            };
        });
}

/** The host's own administrative destinations. The dashboard is one
 * destination: its own section list handles RSVP, invitations, settings and
 * billing, so the global menus link to it once. */
export function useHostMenuItems(): ToolMenuItem[] {
    const t = useTranslations('MobileTabBar.hostMenu');
    const activeEvent = useActiveEvent();

    // A suspended StoryWall shows only the suspended view: no host menu.
    if (!activeEvent || activeEvent.suspended) return [];

    const galleryQrEnabled = isGalleryQrFeatureEnabled(activeEvent.modules);
    const vendorsOn = readableModuleKeys(activeEvent).has('vendors');
    const isDraft = activeEvent.status === 'DRAFT';
    // Deleted events keep the manage page (deletion notice + billing) and nothing else.
    const isDeleted = isEventDeleted(activeEvent);

    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon; hidden?: boolean }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'galleryQr', href: routes.events.tools.galleryQr(activeEvent.id), icon: QrCode, hidden: isDeleted || !galleryQrEnabled },
        { key: 'invitationsQr', href: routes.events.invitationsQr(activeEvent.id), icon: Ticket, hidden: isDeleted || isDraft },
        { key: 'vendors', href: routes.events.manageVendors(activeEvent.id), icon: Store, hidden: isDeleted || isDraft || !vendorsOn },
        { key: 'announcement', href: routes.events.tools.announcement(activeEvent.id), icon: Megaphone, hidden: isDeleted || isDraft },
        { key: 'help', href: routes.events.manage(activeEvent.id, { tab: 'help' }), icon: HelpCircle, hidden: isDeleted },
    ];

    return hostAdminDefinitions
        .filter((item) => !item.hidden)
        .map((item) => ({
            key: item.key,
            href: item.href,
            icon: item.icon,
            label: t(`${item.key}.label`),
            description: t(`${item.key}.description`),
        }));
}
