'use client';

import { ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { OrderFlags } from '@/components/admin/orders/OrderFlags';
import { OrderStatusPill } from '@/components/admin/orders/OrderStatusPill';
import { formatAdminDate, orderPurchaseCode, stripePaymentUrl } from '@/lib/adminOrders';
import type { AdminOrderDetailDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// What the order is, at a glance: amount and state, then the event, the purchase and the time it covers.
// The length in months is left to the price lines, which already name it.
export function OrderSummaryHeader({ order }: { order: AdminOrderDetailDto }) {
    const t = useTranslations('AdminPage.orders');
    const locale = useLocale();
    const { summary, coverage, payment } = order;
    const purchaseCode = orderPurchaseCode(order);

    return (
        <header className="rounded-xl border border-border bg-card p-5">
            {/* Amount and state */}
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-extrabold tracking-tight text-ink tabular-nums sm:text-3xl">
                    {formatMoney(locale, summary.amountMinor, summary.currency)}
                </h1>
                <OrderStatusPill status={summary.status} />
                <OrderFlags order={summary} />
                {payment.provider === 'STRIPE' && payment.providerPaymentId && (
                    <a
                        href={stripePaymentUrl(payment.providerPaymentId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-muted"
                    >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        {t('detail.payment.openInStripe')}
                    </a>
                )}
            </div>

            {/* Key facts */}
            <dl className="mt-4 grid gap-x-8 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
                <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t('detail.summary.event')}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {summary.eventTitle ?? t('untitledEvent')}
                        {summary.eventPurged && <span className="ml-1.5 text-xs font-bold text-ink-faint">{t('flags.eventDeleted')}</span>}
                    </dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t('detail.summary.purchase')}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {t(`kind.${summary.kind}`)}
                        {purchaseCode && <span className="ml-1.5 font-mono text-xs font-normal text-ink-muted">{purchaseCode}</span>}
                    </dd>
                </div>
                {coverage.coverageStartsAt && coverage.coverageEndsAt && (
                    <div className="min-w-0">
                        <dt className="text-xs text-ink-muted">{t('detail.summary.coverage')}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-ink">
                            {formatAdminDate(locale, coverage.coverageStartsAt)} → {formatAdminDate(locale, coverage.coverageEndsAt)}
                        </dd>
                    </div>
                )}
            </dl>
        </header>
    );
}
