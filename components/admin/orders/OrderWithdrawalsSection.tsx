'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminSection } from '@/components/admin/AdminSection';
import { formatAdminDateTime } from '@/lib/adminWithdrawals';
import { formatWithdrawalsHash } from '@/lib/adminWithdrawalsRouting';
import type { AdminOrderWithdrawalDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { cn } from '@/lib/utils';

// Every withdrawal request that concerns the order, oldest first. Only a held one
// has a review page to go to.
export function OrderWithdrawalsSection({ withdrawals, currency }: { withdrawals: AdminOrderWithdrawalDto[]; currency: string }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();

    return (
        <AdminSection title={t('orders.detail.sections.withdrawals')}>
            <ul className="max-w-3xl divide-y divide-border">
                {withdrawals.map((withdrawal) => (
                    <li key={withdrawal.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                        {/* Status and date */}
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                                    withdrawal.status === 'HELD' ? 'bg-status-warn-wash text-status-warn' : 'bg-surface-muted text-ink-muted',
                                )}
                            >
                                {t(`orders.detail.withdrawals.status.${withdrawal.status}`)}
                            </span>
                            <span className="text-ink-muted">{t(`withdrawals.scope.${withdrawal.scope}`)}</span>
                            <span className="font-mono text-[12px] text-ink-faint">{formatAdminDateTime(locale, withdrawal.createdAt)}</span>
                            {withdrawal.status === 'HELD' && (
                                <a
                                    href={formatWithdrawalsHash(withdrawal.id)}
                                    className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-primary-dark hover:underline"
                                >
                                    {t('orders.detail.withdrawals.review')}
                                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                                </a>
                            )}
                        </div>

                        {/* This order's share */}
                        <p className="text-sm text-ink">
                            {withdrawal.line
                                ? t('orders.detail.withdrawals.thisOrder', { amount: formatMoney(locale, withdrawal.line.refundMinor, currency) })
                                : t('orders.detail.withdrawals.notPriced')}
                        </p>

                        {/* Reason and decision */}
                        {withdrawal.reason && <p className="text-sm whitespace-pre-line text-ink-muted">{withdrawal.reason}</p>}
                        {withdrawal.decisionNote && <p className="text-xs whitespace-pre-line text-ink-faint">{withdrawal.decisionNote}</p>}
                    </li>
                ))}
            </ul>
        </AdminSection>
    );
}
