'use client';

import { useTranslations } from 'next-intl';

import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';

export function AdminTopbar() {
    const t = useTranslations('AdminPage');
    const { tab, tabs } = useAdminNavigation();
    const activeLabel = tabs.find((item) => item.key === tab)?.label;

    return <AdminBreadcrumb root={t('layout.console')} current={activeLabel} />;
}
