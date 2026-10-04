'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import type { OrderActivityItem } from '@/lib/adminOrders';
import { formatWithdrawalsHash } from '@/lib/adminWithdrawalsRouting';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

// What one activity entry says. Only a held withdrawal has a review page to go to.
export function OrderActivityContent({ item, currency }: { item: OrderActivityItem; currency: string }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const title = 'text-sm font-semibold text-ink';
    const note = 'mt-0.5 text-sm text-ink-muted';

    switch (item.kind) {
        case 'placed':
        case 'disputeClosed':
            return <p className={title}>{t(`orders.detail.activity.${item.kind}`)}</p>;

        case 'paid':
            return (
                <>
                    <p className={title}>{t('orders.detail.activity.paid')}</p>
                    {item.settledBy && <p className={note}>{t('orders.detail.activity.settledBy', { name: item.settledBy })}</p>}
                </>
            );

        case 'disputeOpened':
            return <p className={cn(title, 'text-status-danger')}>{t('orders.detail.activity.disputeOpened')}</p>;

        case 'refunded':
            return (
                <div className="space-y-2">
                    <div>
                        <p className={title}>
                            {item.refund.amountMinor !== null
                                ? t('orders.detail.activity.refunded', { amount: formatMoney(locale, item.refund.amountMinor, currency) })
                                : t('orders.detail.activity.refundedNotRecorded')}
                        </p>
                        {item.refund.source && <p className={note}>{t(`orders.refundSource.${item.refund.source}`)}</p>}
                    </div>
                    {item.refund.providerRefundId && (
                        <AdminIdentifier label={t('orders.detail.refund.stripeRefund')} value={item.refund.providerRefundId} hideValue />
                    )}
                </div>
            );

        case 'withdrawal': {
            const { withdrawal } = item;
            return (
                <div className="space-y-1">
                    {/* Status and scope */}
                    <div className="flex flex-wrap items-center gap-2">
                        <p className={title}>{t('orders.detail.activity.withdrawal', { scope: t(`withdrawals.scope.${withdrawal.scope}`) })}</p>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                withdrawal.status === 'HELD' ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted',
                            )}
                        >
                            {t(`orders.detail.withdrawals.status.${withdrawal.status}`)}
                        </span>
                        {withdrawal.status === 'HELD' && (
                            <a
                                href={formatWithdrawalsHash(withdrawal.id)}
                                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary-dark hover:underline"
                            >
                                {t('orders.detail.withdrawals.review')}
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                            </a>
                        )}
                    </div>

                    {/* This order's share */}
                    <p className={note}>
                        {withdrawal.line
                            ? t('orders.detail.withdrawals.thisOrder', { amount: formatMoney(locale, withdrawal.line.refundMinor, currency) })
                            : t('orders.detail.withdrawals.notPriced')}
                    </p>

                    {/* Reason and decision */}
                    {withdrawal.reason && <p className="border-l-2 border-border pl-3 text-sm whitespace-pre-line text-ink">{withdrawal.reason}</p>}
                    {withdrawal.decisionNote && <p className="text-xs whitespace-pre-line text-ink-faint">{withdrawal.decisionNote}</p>}
                </div>
            );
        }

        case 'commission': {
            const { commission } = item;
            return (
                <>
                    <p className={title}>
                        {t(commission.entryType === 'CLAWBACK' ? 'orders.detail.activity.clawback' : 'orders.detail.activity.commission', {
                            name: commission.collaboratorName,
                        })}
                        <span className="ml-2 font-mono tabular-nums">{formatMoney(locale, commission.amountMinor, commission.currency)}</span>
                        {commission.commissionPercent !== null && (
                            <span className="ml-1.5 font-mono text-xs font-normal text-ink-faint">
                                {t('orders.detail.commission.percent', { percent: commission.commissionPercent })}
                            </span>
                        )}
                    </p>
                    <p className={note}>{t(`collaborations.earnings.status.${commission.status}`)}</p>
                </>
            );
        }
    }
}
