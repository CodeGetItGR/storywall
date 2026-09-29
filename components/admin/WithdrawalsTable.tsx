'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { countFiredSignals, formatAdminDateTime } from '@/lib/adminWithdrawals';
import { formatWithdrawalsHash } from '@/lib/adminWithdrawalsRouting';
import type { WithdrawalAdminDto } from '@/lib/api/types';
import { formatOptionalMoney } from '@/lib/billing';

export function WithdrawalsTable({ rows }: { rows: WithdrawalAdminDto[] }) {
    const t = useTranslations('AdminPage.withdrawals');
    const locale = useLocale();

    return (
        <section className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-2.5 font-bold">{t('columns.refund')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.scope')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.signals')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.submitted')}</th>
                        <th className="px-3 py-2.5" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ request, fraudSignals }) => {
                        const fired = countFiredSignals(fraudSignals);
                        return (
                            <tr key={request.id} className="relative border-b border-border last:border-b-0 hover:bg-canvas/60">
                                <td className="px-4 py-2.5">
                                    {/* The link covers the whole row */}
                                    <a href={formatWithdrawalsHash(request.id)} className="after:absolute after:inset-0">
                                        <span className="block font-mono font-semibold text-ink tabular-nums">
                                            {formatOptionalMoney(request.totalRefundMinor, request.currency, locale) ?? t('noAmount')}
                                        </span>
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 text-ink-muted">{t(`scope.${request.scope ?? 'EVENT'}`)}</td>
                                <td className="px-3 py-2.5">
                                    {fired > 0 ? (
                                        <span className="rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-bold text-status-warn">
                                            {t('signalsFired', { count: fired })}
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                                            {t('manualReview')}
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">{formatAdminDateTime(locale, request.createdAt)}</td>
                                <td className="px-3 py-2.5 text-ink-faint">
                                    <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}
