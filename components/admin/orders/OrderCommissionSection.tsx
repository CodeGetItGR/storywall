'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import type { AdminOrderCommissionDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';

// Partner earnings on the order. A reversal offsets an earning after a refund.
export function OrderCommissionSection({ commissions }: { commissions: AdminOrderCommissionDto[] }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <AdminSection title={t('orders.detail.sections.commission')}>
            <ul className="max-w-3xl divide-y divide-border">
                {commissions.map((commission) => (
                    <li
                        key={commission.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 text-sm first:pt-0 last:pb-0"
                    >
                        {/* Partner */}
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{commission.collaboratorName}</p>
                            <p className="text-xs text-ink-muted">
                                {commission.entryType === 'CLAWBACK'
                                    ? t('collaborations.earnings.entryTypes.CLAWBACK')
                                    : t('orders.detail.commission.earned')}
                                {' · '}
                                {t(`collaborations.earnings.status.${commission.status}`)}
                                {' · '}
                                <span className="font-mono">{formatAdminDateTime(locale, commission.createdAt)}</span>
                            </p>
                        </div>

                        {/* Amount */}
                        <p className="shrink-0 text-right font-mono font-semibold text-ink tabular-nums">
                            {formatMoney(locale, commission.amountMinor, commission.currency)}
                            {commission.commissionPercent !== null && (
                                <span className="ml-2 text-xs font-normal text-ink-faint">
                                    {t('orders.detail.commission.percent', { percent: commission.commissionPercent })}
                                </span>
                            )}
                        </p>
                    </li>
                ))}
            </ul>
        </AdminSection>
    );
}
