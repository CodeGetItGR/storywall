'use client';

import { Baseline, LayoutTemplate, type LucideIcon, TextQuote, Type } from 'lucide-react';
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
                items: [
                    item('themes', routes.saveMyDateAdmin.themes, t('tabs.invitationThemes'), LayoutTemplate),
                    item('fonts', routes.saveMyDateAdmin.fonts, t('saveMyDate.fonts.title'), Type),
                    item('fontPairings', routes.saveMyDateAdmin.fontPairings, t('saveMyDate.fontPairings.title'), Baseline),
                    item('texts', routes.saveMyDateAdmin.texts, t('saveMyDate.texts.title'), TextQuote),
                ],
            },
        ];
    }, [pathname, t]);

    const activeLabel = groups.flatMap((group) => group.items).find((navItem) => navItem.active)?.label;

    return { groups, activeLabel };
}
