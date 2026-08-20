import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { type BillingData, type BillingDerived, type BillingInsights, useBillingDate } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';
import { getEventBillingStatusTone } from '@/lib/statusTones';
import { cn } from '@/lib/utils';

const statusIcons = {
    ACTIVE: CheckCircle2,
    DRAFT: Clock3,
    FROZEN: AlertTriangle,
    PURGED: XCircle,
} as const;

/**
 * The one always-visible answer to "is this event paid for?" — it sits above the
 * billing sub-tabs so switching tabs never hides the state they all describe.
 */
export function BillingStatusHeader({ data, derived, insights }: { data: BillingData; derived: BillingDerived; insights: BillingInsights }) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();
    const StatusIcon = statusIcons[data.eventStatus];
    const { coverage } = derived;

    return (
        <section className={cn(derived.isRiskState && 'border-l-2 border-amber-500 pl-3')}>
            {/* Status */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                            getEventBillingStatusTone(data.eventStatus)
                        )}
                    >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {t(`eventStatus.${data.eventStatus}`)}
                    </span>
                    <span className="text-sm font-semibold text-ink">{data.planTierName}</span>
                </div>
                <span className="text-xs font-semibold text-ink-muted">
                    {t('facts.totalPaid')} · {formatMoney(locale, insights.paidTotalMinor, insights.orderCurrency)}
                </span>
            </div>

            {/* Summary */}
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
                {data.eventStatus === 'PURGED'
                    ? t('summary.PURGED')
                    : data.eventStatus === 'FROZEN'
                      ? t('summary.FROZEN', { date: formatDate(coverage.paidThrough) })
                      : data.eventStatus === 'DRAFT'
                        ? t('summary.DRAFT')
                        : coverage.unlimited
                          ? t('summary.ACTIVE_UNLIMITED')
                          : t('summary.ACTIVE', { date: formatDate(coverage.paidThrough) })}
            </p>
        </section>
    );
}
