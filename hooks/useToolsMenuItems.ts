'use client';

import { BookHeart, CalendarCheck, CalendarDays, Gift, Images, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { routes } from '@/lib/routes';
import { useActiveEvent } from '@/providers/EventProvider';

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
    const availableModules = new Set(activeEvent?.modules.filter((module_) => module_.isAvailable).map((module_) => module_.moduleKey) ?? []);

    if (!activeEvent) return [];

    const toolDefinitions: { key: string; href: string; icon: LucideIcon; moduleKey?: string }[] = [
        { key: 'rsvp', href: routes.events.tools.rsvpSubmit(activeEvent.id), icon: CalendarCheck, moduleKey: 'rsvp' },
        { key: 'schedule', href: routes.events.tools.schedule(activeEvent.id), icon: CalendarDays },
        { key: 'gallery', href: routes.events.tools.gallery(activeEvent.id), icon: Images, moduleKey: 'gallery' },
        { key: 'wishbook', href: routes.events.tools.wishbook(activeEvent.id), icon: BookHeart, moduleKey: 'wishbook' },
        { key: 'gifts', href: routes.events.tools.gifts(activeEvent.id), icon: Gift, moduleKey: 'wishlist' },
    ];

    return toolDefinitions
        .filter((tool) => !tool.moduleKey || availableModules.has(tool.moduleKey))
        .map((tool) => ({
            key: tool.key,
            href: tool.href,
            icon: tool.icon,
            label: t(`items.${tool.key}.label`),
            description: t(`items.${tool.key}.description`),
        }));
}

/** The host's own administrative destinations. The dashboard is one
 * destination: its own section list handles RSVP, invitations, settings and
 * billing, so the global menus link to it once. */
export function useHostMenuItems(): ToolMenuItem[] {
    const t = useTranslations('MobileTabBar.hostMenu');
    const activeEvent = useActiveEvent();

    if (!activeEvent) return [];

    const hostAdminDefinitions: { key: string; href: string; icon: LucideIcon }[] = [
        { key: 'manage', href: routes.events.manage(activeEvent.id), icon: LayoutDashboard },
    ];

    return hostAdminDefinitions.map((item) => ({
        key: item.key,
        href: item.href,
        icon: item.icon,
        label: t(`${item.key}.label`),
        description: t(`${item.key}.description`),
    }));
}
