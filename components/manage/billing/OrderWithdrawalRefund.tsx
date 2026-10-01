import { useTranslations } from 'next-intl';

import type { OrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';

type RefundLine = OrderWithdrawalFlow['refundLines'][number];

// The total the host gets back, with why: one reason line for a single order,
// or a row per order when several are refunded.
export function OrderWithdrawalRefund({ flow }: { flow: OrderWithdrawalFlow }) {
    const t = useTranslations('EventPlanSettingsPage');
    const lines = flow.refundLines;
    const reason = (line: RefundLine) =>
        line.full
            ? t('orderWithdrawal.fullRefund')
            : line.days
              ? t('orderWithdrawal.daysUsed', { used: line.days.used, total: line.days.total })
              : t('orderWithdrawal.partialRefund');

    return (
        <div className="pt-2">
            {/* Rows */}
            {lines.length > 1 && (
                <ul className="mb-3 space-y-2 text-xs">
                    {lines.map((line) => (
                        <li key={line.id} className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-ink">{t(`orders.kind.${line.kind}`)}</p>
                                <p className="text-ink-muted">{reason(line)}</p>
                            </div>
                            <span className="font-semibold text-ink tabular-nums">{line.amount}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Total */}
            <p className="text-lg font-bold text-ink tabular-nums">{t('orderWithdrawal.refund', { amount: flow.refundLabel ?? '' })}</p>
            {lines.length === 1 && <p className="text-xs text-ink-muted">{reason(lines[0])}</p>}
            {flow.preview?.instant && <p className="text-xs text-ink-muted">{t('orderWithdrawal.instant')}</p>}
        </div>
    );
}
