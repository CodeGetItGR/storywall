'use client';

import { useTranslations } from 'next-intl';

import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';
import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import { BillingPlanSummary } from '@/components/manage/billing/BillingPlanSummary';
import { BillingUpgradeSection } from '@/components/manage/billing/BillingUpgradeSection';
import Section from '@/components/manage/Section';
import { useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import type { EventScheduleDto } from '@/lib/api/types';

export default function BillingTab({
    eventId,
    schedule,
    canPurchase,
    isDeleted = false,
}: {
    eventId: string;
    schedule: EventScheduleDto;
    // Only the event's main host can buy anything for it.
    canPurchase: boolean;
    isDeleted?: boolean;
}) {
    const tBilling = useTranslations('EventPlanSettingsPage');
    const tCommon = useTranslations('Common');
    const tPageError = useTranslations('PageErrorState.billing');
    const tPageErrorCommon = useTranslations('PageErrorState');
    const panel = useEventBillingPanel(eventId, { isDeleted, canPurchase });

    if (panel.isLoading) {
        return (
            <div>
                <div className="h-24 animate-pulse rounded-lg bg-surface-muted" />
                <div className="mt-6 h-64 animate-pulse rounded-lg bg-surface-muted" />
            </div>
        );
    }

    const { data, insights, derived } = panel;
    if (panel.hasError || !data || !insights || !derived) {
        return (
            <div className="py-10 text-center">
                <p className="text-sm font-semibold text-ink">{tPageError('title')}</p>
                <p className="mt-1 text-sm text-ink-muted">{tPageError('description')}</p>
                <button
                    type="button"
                    onClick={panel.handleRetry}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-surface-muted px-4 text-xs font-semibold text-ink"
                >
                    {tPageErrorCommon('retry')}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Co-host note */}
            {!canPurchase && !isDeleted && <p className="text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

            {/* Your plan */}
            <BillingPlanSummary data={data} schedule={schedule} usage={panel.usage} />

            {/* Upgrade */}
            <BillingUpgradeSection
                eventId={eventId}
                targets={panel.upgradeTargets}
                currentPlan={panel.currentPlan}
                extraStorageBytes={panel.usage?.extraStorageBytes ?? 0}
                modules={panel.platformModules}
            />

            {/* Add-ons */}
            <BillingAddonsSection eventId={eventId} addons={data.addons} currency={insights.orderCurrency} canManage={derived.canManageAddons} />

            {/* Payments */}
            <Section title={tBilling('orders.title')} divider>
                <BillingOrdersPanel data={data} derived={derived} insights={insights} onShowAllOrders={panel.handleShowAllOrders} />
            </Section>
        </div>
    );
}
