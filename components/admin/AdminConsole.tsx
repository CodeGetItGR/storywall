'use client';

import { useTranslations } from 'next-intl';

import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { BillingOpsPanel } from '@/components/admin/BillingOpsPanel';
import { EventLifecyclePanel } from '@/components/admin/EventLifecyclePanel';
import { ModuleRegistryPanel } from '@/components/admin/ModuleRegistryPanel';
import { PlanAssignmentPanel } from '@/components/admin/PlanAssignmentPanel';
import { PlanCatalogPanel } from '@/components/admin/PlanCatalogPanel';
import { PlatformMetricsPanel } from '@/components/admin/PlatformMetricsPanel';
import { RefundQueuePanel } from '@/components/admin/RefundQueuePanel';

export function AdminConsole() {
    const t = useTranslations('AdminPage');
    const { tab } = useAdminNavigation();

    return (
        <div className="mx-auto px-4 pb-16 pt-5 text-[15px] sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
            <header className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-dark">{t('eyebrow')}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t('title')}</h1>
                <p className="mt-2 max-w-3xl text-base leading-7 text-ink-muted">{t('subtitle')}</p>
            </header>

            <main className="min-w-0">
                {tab === 'metrics' && <PlatformMetricsPanel />}
                {tab === 'eventPlans' && <PlanCatalogPanel scope="EVENT" />}
                {tab === 'modules' && <ModuleRegistryPanel />}
                {tab === 'assignments' && <PlanAssignmentPanel />}
                {tab === 'billingOps' && <BillingOpsPanel />}
                {tab === 'refunds' && <RefundQueuePanel />}
                {tab === 'lifecycle' && <EventLifecyclePanel />}
            </main>
        </div>
    );
}
