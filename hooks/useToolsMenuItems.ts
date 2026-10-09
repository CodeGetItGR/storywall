'use client';

import {
    BookHeart,
    CalendarCheck,
    CalendarDays,
    Gift,
    HelpCircle,
    Images,
    LayoutDashboard,
    type LucideIcon,
    QrCode,
    Ticket,
    UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGiftAccount } from '@/hooks/useGiftAccount';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { isEventDeleted, readableModuleKeys } from '@/lib/eventLifecycle';
import { canEditOwnRole, ROLE_SHEET_VALUE } from '@/lib/memberRoles';
import { isGalleryQrFeatureEnabled } from '@/lib/qrLinks';
import { routes } from '@/lib/routes';
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
    const giftAccount = useGiftAccount(useRouteEventId());
    const availableModules = readableModuleKeys(activeEvent);
    const moduleCopy = useModuleCopy(activeEvent?.eventType);

    // A suspended StoryWall shows only the suspended view: no tool menu.
    if (!activeEvent || activeEvent.suspended) return [];

    // A deleted event is download-only: the gallery archive and the wishbook
    // PDF are the only tools that still do anything.
    const isDeleted = isEventDeleted(activeEvent);

    // copyKey: the module whose event-type name and description label the tool.
    const toolDefinitions: { key: string; href: string; icon: LucideIcon; moduleKey?: string; copyKey?: string }[] = [
        { key: 'rsvp', href: routes.events.tools.rsvpSubmit(activeEvent.id), icon: CalendarCheck, moduleKey: 'rsvp' },
        // Always on, so not filtered by availability; copyKey still names it.
        { key: 'schedule', href: routes.events.tools.schedule(activeEvent.id), icon: CalendarDays, copyKey: 'schedule' },
        { key: 'gallery', href: routes.events.tools.gallery(activeEvent.id), icon: Images, moduleKey: 'gallery' },
        { key: 'wishbook', href: routes.events.tools.wishbook(activeEvent.id), icon: BookHeart, moduleKey: 'wishbook' },
        { key: 'gifts', href: routes.events.tools.gifts(activeEvent.id), icon: Gift, moduleKey: 'wishlist' },
        { key: 'myRole', href: routes.events.feed(activeEvent.id, { sheet: ROLE_SHEET_VALUE }), icon: UserRound, moduleKey: 'member_roles' },
    ];

    return toolDefinitions
        .filter((tool) => !tool.moduleKey || availableModules.has(tool.moduleKey))
        .filter((tool) => tool.key !== 'gallery' || isHost)
        .filter((tool) => tool.key !== 'gifts' || isHost || Boolean(giftAccount.data))
        .filter((tool) => tool.key !== 'myRole' || (!isDemoVisitor && canEditOwnRole(activeEvent, activeMember)))
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
    const isDraft = activeEvent.status === 'DRAFT';
    // Deleted events keep the manage page (deletion notice + billing) and nothing else.
    const isDeleted = isEventDeleted(activeEvent);

    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon; hidden?: boolean }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
        { key: 'galleryQr', href: routes.events.tools.galleryQr(activeEvent.id), icon: QrCode, hidden: isDeleted || !galleryQrEnabled },
        { key: 'invitationsQr', href: routes.events.invitationsQr(activeEvent.id), icon: Ticket, hidden: isDeleted || isDraft },
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
