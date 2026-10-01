import { useLocale, useTranslations } from 'next-intl';

import { WithdrawalExcludedOrders } from '@/components/manage/billing/WithdrawalExcludedOrders';
import { useBillingDate } from '@/hooks/useEventBillingPanel';
import type { WithdrawalResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { withdrawalHistoryFacts } from '@/lib/priceBreakdown';

// Every withdrawal request for the event, newest first.
export function WithdrawalHistory({ withdrawals }: { withdrawals: WithdrawalResponseDto[] }) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const formatDate = useBillingDate();

    return (
        <ul className="divide-y divide-ink/10">
            {withdrawals.map((withdrawal) => {
                const { heldNote, orderKind, keptEventDay, alreadyRefundedLines } = withdrawalHistoryFacts(withdrawal);
                const scopeLabel =
                    withdrawal.scope === 'EVENT' ? t('withdrawalHistory.wholeEvent') : orderKind ? t(`orders.kind.${orderKind}`) : null;
                const statusKey = `withdrawalStatus.${withdrawal.status}`;

                return (
                    <li key={withdrawal.id} className="space-y-1.5 py-3 text-sm first:pt-0 last:pb-0" title={withdrawal.id}>
                        {/* Summary */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    {scopeLabel && <p className="font-semibold text-ink">{scopeLabel}</p>}
                                    {t.has(statusKey) && (
                                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                                            {t(statusKey)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-ink-muted">{formatDate(withdrawal.createdAt)}</p>
                            </div>
                            {withdrawal.status !== 'REFUSED' && (
                                <p className="shrink-0 text-right font-semibold text-ink tabular-nums">
                                    {withdrawal.totalRefundMinor !== null && withdrawal.currency
                                        ? formatMoney(locale, withdrawal.totalRefundMinor, withdrawal.currency)
                                        : null}
                                </p>
                            )}
                        </div>

                        {/* Outcome */}
                        <div className="space-y-1 text-xs leading-relaxed text-ink-muted">
                            {heldNote && <p>{t(`withdrawalHistory.${heldNote}`)}</p>}
                            {withdrawal.status === 'REFUNDED' && (
                                <p>{withdrawal.scope === 'EVENT' ? t('withdrawalHistory.refundedEvent') : t('withdrawalHistory.refundedOrder')}</p>
                            )}
                            {withdrawal.status !== 'REFUSED' && withdrawal.totalRefundMinor === null && <p>{t('withdrawalHistory.noAmount')}</p>}
                            {withdrawal.status === 'REFUSED' && withdrawal.refusals.map((refusal) => <p key={refusal.code}>{refusal.message}</p>)}
                            {keptEventDay && <p>{t('withdrawalHistory.keptEventDay')}</p>}
                            {alreadyRefundedLines.map((line) => (
                                <p key={line.orderId}>{t('withdrawalHistory.alreadyRefunded', { kind: t(`orders.kind.${line.orderKind}`) })}</p>
                            ))}
                            {/* Decision note: plain text, written for the host */}
                            {withdrawal.decisionNote && <p className="whitespace-pre-line text-ink">{withdrawal.decisionNote}</p>}
                        </div>

                        {/* Not refunded (business purchases) */}
                        <WithdrawalExcludedOrders orders={withdrawal.excludedOrders} />
                    </li>
                );
            })}
        </ul>
    );
}
