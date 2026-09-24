import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { EventWithdrawalFlow } from '@/hooks/useEventWithdrawalFlow';
import { formatMoney } from '@/lib/billing';

export function WithdrawalPanel({ panel }: { panel: EventWithdrawalFlow }) {
    const t = useTranslations('EventPlanSettingsPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { withdrawalPreview, withdrawalHistory, latestWithdrawal } = panel;

    if (withdrawalPreview.isLoading || withdrawalHistory.isLoading) {
        return <p className="text-sm text-ink-muted">{t('withdrawal.loading')}</p>;
    }

    // A REFUNDED withdrawal is terminal — the event is soft-deleted server-side.
    // HELD leaves the event untouched pending an admin decision; WITHHELD means an
    // admin refused it (and the host's account was suspended in the same action).
    if (latestWithdrawal && latestWithdrawal.status !== 'REFUSED') {
        return (
            <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">
                        {latestWithdrawal.totalRefundMinor !== null && latestWithdrawal.currency
                            ? formatMoney(locale, latestWithdrawal.totalRefundMinor, latestWithdrawal.currency)
                            : t('withdrawal.requestedNoAmount')}
                    </p>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                        {t(`withdrawalStatus.${latestWithdrawal.status}`)}
                    </span>
                </div>
                {latestWithdrawal.status === 'HELD' && <p className="text-xs leading-relaxed text-ink-muted">{t('withdrawal.held')}</p>}
                {latestWithdrawal.status === 'WITHHELD' && latestWithdrawal.decisionNote && (
                    <p className="text-xs leading-relaxed text-ink-muted">{latestWithdrawal.decisionNote}</p>
                )}
                {latestWithdrawal.status === 'REFUNDED' && <p className="text-xs leading-relaxed text-ink-muted">{t('withdrawal.refunded')}</p>}
            </div>
        );
    }

    if (!withdrawalPreview.data?.eligible) {
        return (
            <div className="text-sm">
                <p className="text-ink-muted">{t('withdrawal.notEligible')}</p>
                {withdrawalPreview.data?.refusals.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-ink-faint">
                        {withdrawalPreview.data.refusals.map((refusal) => (
                            <li key={refusal.code}>{refusal.message}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <form onSubmit={panel.askWithdrawalConfirmation} className="space-y-3 text-sm">
                <p className="text-ink-muted">
                    {panel.withdrawalDeadlineLabel
                        ? t('withdrawal.eligibleUntil', { date: panel.withdrawalDeadlineLabel, amount: panel.refundAmountLabel })
                        : t('withdrawal.eligible', { amount: panel.refundAmountLabel })}
                </p>
                <label className="block">
                    <span className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                        {t('withdrawal.reason')} <span className="text-ink-faint/80">({tCommon('optional')})</span>
                    </span>
                    <textarea
                        value={panel.withdrawalReason}
                        onChange={panel.handleWithdrawalReasonChange}
                        rows={2}
                        maxLength={1000}
                        className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink transition outline-none focus:ring-2 focus:ring-primary/15"
                        placeholder={t('withdrawal.reasonPlaceholder')}
                    />
                </label>
                {panel.withdrawalError && <p className="text-xs text-rose-600">{panel.withdrawalError}</p>}
                <button
                    type="submit"
                    disabled={panel.isSubmittingWithdrawal}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                    {panel.isSubmittingWithdrawal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {panel.isSubmittingWithdrawal ? t('withdrawal.submitting') : t('withdrawal.submit')}
                </button>
            </form>

            <ConfirmActionModal
                open={panel.confirmingWithdrawal}
                title={t('withdrawal.submit')}
                body={
                    withdrawalPreview.data?.scheduleMovedAfterPayment
                        ? `${t('withdrawal.confirmBody')} ${t('withdrawal.confirmReviewed')}`
                        : t('withdrawal.confirmBody')
                }
                confirmLabel={
                    panel.withdrawalRetryIn > 0 ? t('actions.retryIn', { seconds: panel.withdrawalRetryIn }) : t('withdrawal.confirmSubmit')
                }
                cancelLabel={t('withdrawal.confirmCancel')}
                onCloseAction={panel.cancelWithdrawalConfirmation}
                onConfirmAction={panel.submitWithdrawalRequest}
                isConfirming={panel.isSubmittingWithdrawal || panel.withdrawalRetryIn > 0}
            />
        </>
    );
}
