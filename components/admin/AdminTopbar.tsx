'use client';

import { useTranslations } from 'next-intl';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';

export function AdminTopbar() {
    const t = useTranslations('AdminPage');
    const { tab, tabs } = useAdminNavigation();
    const activeLabel = tabs.find((item) => item.key === tab)?.label;

    return (
        <header className="sticky top-0 z-20 hidden items-center gap-2 border-b border-border bg-card/90 px-6 py-2.5 text-[13px] text-ink-faint backdrop-blur lg:flex">
            <span>{t('layout.console')}</span>
            <span aria-hidden="true">›</span>
            <span className="font-bold text-ink">{activeLabel}</span>
        </header>
    );
}
