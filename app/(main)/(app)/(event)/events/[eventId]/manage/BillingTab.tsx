'use client';

import { useTranslations } from 'next-intl';

import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';
import { BillingExtensionSection } from '@/components/manage/billing/BillingExtensionSection';
import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import { BillingPlanSummary } from '@/components/manage/billing/BillingPlanSummary';
import { BillingUpgradeSection } from '@/components/manage/billing/BillingUpgradeSection';
import { OrderWithdrawalModal } from '@/components/manage/billing/OrderWithdrawalModal';
import { StorageTrimNotice } from '@/components/manage/billing/StorageTrimNotice';
import { WithdrawalHistory } from '@/components/manage/billing/WithdrawalHistory';
import { BillingTabSkeleton } from '@/components/manage/ManageSkeletons';
import Section from '@/components/manage/Section';
import { useBillingWithdrawals } from '@/hooks/useBillingWithdrawals';
import { useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import { useOrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';
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
    const withdrawals = useBillingWithdrawals(eventId, panel.data?.orders, {
        canWithdraw: canPurchase && !isDeleted,
        canSeeHistory: canPurchase || isDeleted,
    });
    const withdrawalFlow = useOrderWithdrawalFlow(eventId, { currentLimitBytes: panel.usage?.storageLimitBytes ?? null });

    if (panel.isLoading) {
        return <BillingTabSkeleton />;
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

            {/* Storage over the limit */}
            <StorageTrimNotice dueAt={data.storageTrimDueAt} />

            {/* Your plan */}
            <BillingPlanSummary data={data} schedule={schedule} usage={panel.usage} />

            {/* Upgrade */}
            {withdrawals.purchaseBlocks.upgradeBlocked && panel.upgradeTargets.length > 0 && (
                <p className="text-xs text-ink-muted">{tBilling('purchasesPaused.upgrades')}</p>
            )}
            <BillingUpgradeSection
                eventId={eventId}
                targets={withdrawals.purchaseBlocks.upgradeBlocked ? [] : panel.upgradeTargets}
                currentPlan={panel.currentPlan}
                extraStorageBytes={panel.usage?.extraStorageBytes ?? 0}
                modules={panel.platformModules}
            />

            {/* Extend coverage */}
            {!isDeleted && (
                <BillingExtensionSection
                    eventId={eventId}
                    eventStatus={data.eventStatus}
                    coverageEndsAt={schedule.coverageEndsAt}
                    canPurchase={canPurchase}
                />
            )}

            {/* Add-ons */}
            <BillingAddonsSection eventId={eventId} addons={data.addons} currency={insights.orderCurrency} canManage={derived.canManageAddons} />

            {/* Payments */}
            <Section title={tBilling('orders.title')} divider>
                <BillingOrdersPanel
                    data={data}
                    derived={derived}
                    insights={insights}
                    onShowAllOrders={panel.handleShowAllOrders}
                    withdrawableOrderIds={withdrawals.withdrawableOrderIds}
                    onWithdrawAction={withdrawalFlow.open}
                />
            </Section>

            {/* Withdrawals */}
            {withdrawals.history.length > 0 && (
                <Section title={tBilling('withdrawalHistory.title')} divider>
                    <WithdrawalHistory withdrawals={withdrawals.history} />
                </Section>
            )}

            <OrderWithdrawalModal flow={withdrawalFlow} />
        </div>
    );
}
