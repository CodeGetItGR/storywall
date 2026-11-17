'use client';

import { useTranslations } from 'next-intl';

import { BillingAddonsSection } from '@/components/manage/billing/BillingAddonsSection';
import { BillingExtensionSection } from '@/components/manage/billing/BillingExtensionSection';
import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import { BillingPlanCard } from '@/components/manage/billing/BillingPlanCard';
import { BillingUpgradeSection } from '@/components/manage/billing/BillingUpgradeSection';
import { OrderWithdrawalModal } from '@/components/manage/billing/OrderWithdrawalModal';
import { StorageTrimNotice } from '@/components/manage/billing/StorageTrimNotice';
import { WithdrawalHistory } from '@/components/manage/billing/WithdrawalHistory';
import { BillingTabSkeleton } from '@/components/manage/ManageSkeletons';
import { useBillingWithdrawals } from '@/hooks/useBillingWithdrawals';
import { useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import { useOrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';
import type { EventScheduleDto } from '@/lib/api/types';

// KAN-229: Billing on one page, everything open. Phones: Your plan, Upgrade options, Extend coverage,
// Paid add-ons, Order history. Desktop: Order history (and withdrawals) in a column beside the rest.
export default function BillingTab({
    eventId,
    schedule,
    canPurchase,
    isDeleted = false,
    withdrawalOnly = false,
}: {
    eventId: string;
    schedule: EventScheduleDto;
    // Only the event's main host can buy anything for it.
    canPurchase: boolean;
    isDeleted?: boolean;
    // A suspended StoryWall's billing page (SuspendedEventBilling): plan, payments and withdrawal
    // only. Nothing can be bought, and the server refuses every purchase read (4015).
    withdrawalOnly?: boolean;
}) {
    const tBilling = useTranslations('EventPlanSettingsPage');
    const tCommon = useTranslations('Common');
    const tPageError = useTranslations('PageErrorState.billing');
    const tPageErrorCommon = useTranslations('PageErrorState');
    const panel = useEventBillingPanel(eventId, { isDeleted, canPurchase: canPurchase && !withdrawalOnly });
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
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-7">
            {/* Main column */}
            <div className="flex min-w-0 flex-col gap-6">
                {/* Co-host note */}
                {!canPurchase && !isDeleted && <p className="text-xs text-ink-muted">{tCommon('primaryHostOnly')}</p>}

                {/* Storage over the limit */}
                <StorageTrimNotice dueAt={data.storageTrimDueAt} />

                {/* Your plan */}
                <BillingPlanCard data={data} schedule={schedule} usage={panel.usage} />

                {/* Upgrade and extend: side by side on desktop, one under the other on phones */}
                {!withdrawalOnly && (
                    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] lg:items-start">
                        {/* Upgrade (hidden while empty, so Extend coverage takes the full width) */}
                        <div className="flex flex-col gap-2 empty:hidden">
                            {withdrawals.purchaseBlocks.upgradeBlocked && panel.upgradeTargets.length > 0 && (
                                <p className="text-xs text-ink-muted">{tBilling('purchasesPaused.upgrades')}</p>
                            )}
                            <BillingUpgradeSection
                                eventId={eventId}
                                targets={withdrawals.purchaseBlocks.upgradeBlocked ? [] : panel.upgradeTargets}
                                currentPlan={panel.currentPlan}
                                extraStorageBytes={panel.usage?.extraStorageBytes ?? 0}
                            />
                        </div>

                        {/* Extend coverage */}
                        {!isDeleted && (
                            <BillingExtensionSection
                                eventId={eventId}
                                eventStatus={data.eventStatus}
                                coverageEndsAt={schedule.coverageEndsAt}
                                canPurchase={canPurchase}
                            />
                        )}
                    </div>
                )}

                {/* Paid add-ons */}
                {!withdrawalOnly && (
                    <BillingAddonsSection eventId={eventId} addons={data.addons} currency={insights.orderCurrency} canManage={derived.canManageAddons} />
                )}
            </div>

            {/* Side column */}
            <div className="flex flex-col gap-6 lg:rounded-[24px] lg:border lg:border-border lg:px-[22px] lg:py-5">
                {/* Order history */}
                <BillingOrdersPanel
                    data={data}
                    derived={derived}
                    insights={insights}
                    onShowAllOrders={panel.handleShowAllOrders}
                    withdrawableOrderIds={withdrawals.withdrawableOrderIds}
                    onWithdrawAction={withdrawalFlow.open}
                />

                {/* Withdrawals */}
                {withdrawals.history.length > 0 && (
                    <section aria-labelledby="billing-withdrawals-title" className="flex flex-col gap-3 border-t border-border pt-5">
                        <h2 id="billing-withdrawals-title" className="text-[17px] font-bold text-ink">
                            {tBilling('withdrawalHistory.title')}
                        </h2>
                        <WithdrawalHistory withdrawals={withdrawals.history} />
                    </section>
                )}
            </div>

            <OrderWithdrawalModal flow={withdrawalFlow} />
        </div>
    );
}
