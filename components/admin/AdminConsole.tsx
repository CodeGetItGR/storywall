'use client';

import { useTranslations } from 'next-intl';

import { AccountsPanel } from '@/components/admin/AccountsPanel';
import { AdminDiscountCodesPanel } from '@/components/admin/AdminDiscountCodesPanel';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { BillingOpsPanel } from '@/components/admin/BillingOpsPanel';
import { CollaborationsPanel } from '@/components/admin/CollaborationsPanel';
import { CostTrackingPanel } from '@/components/admin/CostTrackingPanel';
import { PaidServicesCatalogPanel } from '@/components/admin/PaidServicesCatalogPanel';
import { PlanAssignmentPanel } from '@/components/admin/PlanAssignmentPanel';
import { PlansSection } from '@/components/admin/plans/PlansSection';
import { PlatformMetricsPanel } from '@/components/admin/PlatformMetricsPanel';
import { ReactionTypesCatalogPanel } from '@/components/admin/ReactionTypesCatalogPanel';
import { WithdrawalQueuePanel } from '@/components/admin/WithdrawalQueuePanel';

export function AdminConsole() {
    const t = useTranslations('AdminPage');
    const { tab } = useAdminNavigation();

    // The Paid Services panel supplies its own page head (title, stat tiles,
    // primary action) — the shared eyebrow/title block would just duplicate it.
    if (tab === 'paidServices') return <PaidServicesCatalogPanel />;
    if (tab === 'plans') return <PlansSection />;
    if (tab === 'discountCodes') return <AdminDiscountCodesPanel />;
    if (tab === 'collaborations') return <CollaborationsPanel />;
    if (tab === 'reactionTypes') return <ReactionTypesCatalogPanel />;
    if (tab === 'accounts') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                <AccountsPanel />
            </div>
        );
    }

    return (
        <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            <header className="mb-5">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-dark uppercase">{t('eyebrow')}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t('title')}</h1>
                <p className="mt-2 max-w-3xl text-base leading-7 text-ink-muted">{t('subtitle')}</p>
            </header>

            <main className="min-w-0">
                {tab === 'metrics' && <PlatformMetricsPanel />}
                {tab === 'costTracking' && <CostTrackingPanel />}
                {tab === 'assignments' && <PlanAssignmentPanel />}
                {tab === 'billingOps' && <BillingOpsPanel />}
                {tab === 'withdrawals' && <WithdrawalQueuePanel />}
            </main>
        </div>
    );
}
