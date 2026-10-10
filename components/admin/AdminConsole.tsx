'use client';

import { useTranslations } from 'next-intl';

import { AccountsPanel } from '@/components/admin/AccountsPanel';
import { AdminDiscountCodesPanel } from '@/components/admin/AdminDiscountCodesPanel';
import { useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import { BugReportsPanel } from '@/components/admin/betaFeedback/BugReportsPanel';
import { ErrorEventsPanel } from '@/components/admin/betaFeedback/ErrorEventsPanel';
import { BillingOpsPanel } from '@/components/admin/BillingOpsPanel';
import { CollaborationsSection } from '@/components/admin/collaborations/CollaborationsSection';
import { CostTrackingPanel } from '@/components/admin/CostTrackingPanel';
import { DemoEventsSection } from '@/components/admin/demoEvents/DemoEventsSection';
import { EventsSection } from '@/components/admin/events/EventsSection';
import { FunnelPanel } from '@/components/admin/funnel/FunnelPanel';
import { ModerationPanel } from '@/components/admin/moderation/ModerationPanel';
import { OrdersSection } from '@/components/admin/orders/OrdersSection';
import { PaidServicesCatalogPanel } from '@/components/admin/PaidServicesCatalogPanel';
import { PartnerCardsSection } from '@/components/admin/partnerCards/PartnerCardsSection';
import { PlansSection } from '@/components/admin/plans/PlansSection';
import { PlatformMetricsPanel } from '@/components/admin/PlatformMetricsPanel';
import { ReactionTypesCatalogPanel } from '@/components/admin/ReactionTypesCatalogPanel';
import { ThemeFontsPanel } from '@/components/admin/themeFonts/ThemeFontsPanel';
import { ThemePresetsPanel } from '@/components/admin/themePresets/ThemePresetsPanel';
import { WithdrawalsSection } from '@/components/admin/WithdrawalsSection';

export function AdminConsole() {
    const t = useTranslations('AdminPage');
    const { tab } = useAdminNavigation();

    // The Paid Services panel supplies its own page head (title, stat tiles,
    // primary action) — the shared eyebrow/title block would just duplicate it.
    if (tab === 'metrics') return <PlatformMetricsPanel />;
    if (tab === 'funnel') return <FunnelPanel />;
    if (tab === 'paidServices') return <PaidServicesCatalogPanel />;
    if (tab === 'plans') return <PlansSection />;
    if (tab === 'discountCodes') return <AdminDiscountCodesPanel />;
    if (tab === 'collaborations') return <CollaborationsSection />;
    if (tab === 'partnerCards') return <PartnerCardsSection />;
    if (tab === 'reactionTypes') return <ReactionTypesCatalogPanel />;
    if (tab === 'themePresets') return <ThemePresetsPanel />;
    if (tab === 'themeFonts') return <ThemeFontsPanel />;
    if (tab === 'demoEvents') return <DemoEventsSection />;
    if (tab === 'withdrawals') return <WithdrawalsSection />;
    if (tab === 'orders') return <OrdersSection />;
    if (tab === 'events') return <EventsSection />;
    if (tab === 'reports') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                <ModerationPanel />
            </div>
        );
    }
    if (tab === 'bugReports' || tab === 'errorEvents') {
        return (
            <div className="mx-auto px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                {tab === 'bugReports' ? <BugReportsPanel /> : <ErrorEventsPanel />}
            </div>
        );
    }
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
                {tab === 'costTracking' && <CostTrackingPanel />}
                {tab === 'billingOps' && <BillingOpsPanel />}
            </main>
        </div>
    );
}
