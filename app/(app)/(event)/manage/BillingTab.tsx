'use client';

import { useTranslations } from 'next-intl';

import { BillingCoveragePanel } from '@/components/manage/billing/BillingCoveragePanel';
import { BillingOrdersPanel } from '@/components/manage/billing/BillingOrdersPanel';
import { BillingPlanPanel } from '@/components/manage/billing/BillingPlanPanel';
import { BillingRefundPanel } from '@/components/manage/billing/BillingRefundPanel';
import { BillingStatusHeader } from '@/components/manage/billing/BillingStatusHeader';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useBillingDate, useEventBillingPanel } from '@/hooks/useEventBillingPanel';
import type { BillingSection } from '@/lib/manageSections';

/**
 * Plan, coverage, orders and refund are top-level sections of the dashboard, so
 * this container renders the shared status header plus the one requested panel
 * instead of a second level of tabs.
 */
export default function BillingTab({ eventId, section }: { eventId: string; section: BillingSection }) {
    const t = useTranslations('EventPlanSettingsPage');
    const tPageError = useTranslations('PageErrorState.billing');
    const tPageErrorCommon = useTranslations('PageErrorState');
    const formatDate = useBillingDate();
    const panel = useEventBillingPanel(eventId);

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
        <div className="flex flex-col gap-5">
            {/* Status */}
            <BillingStatusHeader data={data} derived={derived} insights={insights} />

            {/* Section */}
            {section === 'plan' && (
                <BillingPlanPanel
                    eventId={eventId}
                    data={data}
                    derived={derived}
                    insights={insights}
                    currentPlan={panel.currentPlan}
                    nextPlan={panel.nextPlan}
                    paidAddonOffers={panel.paidAddonOffers}
                />
            )}

            {section === 'coverage' && (
                <BillingCoveragePanel eventId={eventId} derived={derived} insights={insights} onCancelSubscription={panel.askCancelConfirmation} />
            )}

            {section === 'orders' && (
                <BillingOrdersPanel data={data} derived={derived} insights={insights} onShowAllOrders={panel.handleShowAllOrders} />
            )}

            {section === 'refund' && <BillingRefundPanel panel={panel} />}

            {/* Cancel confirmation */}
            <ConfirmActionModal
                open={panel.confirmingCancel}
                title={t('subscription.cancelConfirmTitle')}
                body={
                    <div className="space-y-2">
                        <p>{t('subscription.cancelConfirmBody', { date: formatDate(derived.subscriptionPeriodEnd) })}</p>
                        {panel.cancelError && <p className="text-xs text-rose-600">{panel.cancelError}</p>}
                    </div>
                }
                confirmLabel={t('subscription.cancelConfirmYes')}
                cancelLabel={t('subscription.cancelConfirmNo')}
                onCloseAction={panel.dismissCancelConfirmation}
                onConfirmAction={panel.confirmCancelSubscription}
                isConfirming={panel.isCancelling}
            />
        </div>
    );
}
