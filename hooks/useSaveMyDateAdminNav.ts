'use client';

import { LayoutTemplate, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { routes } from '@/lib/routes';

export type SaveMyDateAdminNavItem = { key: string; href: string; label: string; icon: LucideIcon; active: boolean };
export type SaveMyDateAdminNavGroup = { key: string; label: string; items: SaveMyDateAdminNavItem[] };

// The Save my date admin's menu, grouped by domain, with the section open at the current address marked.
export function useSaveMyDateAdminNav() {
    const t = useTranslations('AdminPage');
    const pathname = usePathname();

    const groups = useMemo<SaveMyDateAdminNavGroup[]>(() => {
        const item = (key: string, href: string, label: string, icon: LucideIcon): SaveMyDateAdminNavItem => ({
            key,
            href,
            label,
            icon,
            active: pathname === href || pathname.startsWith(`${href}/`),
        });
        return [
            {
                key: 'catalog',
                label: t('layout.groupCatalog'),
                items: [item('themes', routes.saveMyDateAdmin.themes, t('tabs.invitationThemes'), LayoutTemplate)],
            },
        ];
    }, [pathname, t]);

    const activeLabel = groups.flatMap((group) => group.items).find((navItem) => navItem.active)?.label;

    return { groups, activeLabel };
}
