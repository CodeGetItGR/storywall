import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { EventBillingPanel } from '@/hooks/useEventBillingPanel';
import { formatMoney } from '@/lib/billing';

export function BillingRefundPanel({ panel }: { panel: EventBillingPanel }) {
    const t = useTranslations('EventPlanSettingsPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const { refundEligibility, refundHistory, refundRequest } = panel;

    if (refundEligibility.isLoading || refundHistory.isLoading) {
        return <p className="text-sm text-ink-muted">{t('refund.loading')}</p>;
    }

    if (refundRequest) {
        return (
            <div className="space-y-2 text-sm">
                {/* Decision */}
                <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">
                        {refundRequest.amountMinor !== null && refundRequest.currency
                            ? formatMoney(locale, refundRequest.amountMinor, refundRequest.currency)
                            : t('refund.requestedNoAmount')}
                    </p>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                        {t(`refundStatus.${refundRequest.status}`)}
                    </span>
                </div>
                {refundRequest.decisionNote && <p className="text-xs leading-relaxed text-ink-muted">{refundRequest.decisionNote}</p>}
                {/* Approved but no money moved yet: say so rather than let the
                    host assume the payment is already back. */}
                {refundRequest.status === 'APPROVED' && !refundRequest.providerRefunded && (
                    <p className="text-xs leading-relaxed text-amber-700">{t('refund.notRefundedYet')}</p>
                )}
            </div>
        );
    }

    if (refundEligibility.data?.hasPendingRequest) {
        return <p className="text-sm text-ink-muted">{t('refund.pending')}</p>;
    }

    if (!refundEligibility.data?.eligible) {
        return (
            <div className="text-sm">
                <p className="text-ink-muted">{t('refund.notEligible')}</p>
                {refundEligibility.data?.reasons.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-ink-faint">
                        {refundEligibility.data.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                        ))}
                    </ul>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <form onSubmit={panel.askRefundConfirmation} className="space-y-3 text-sm">
                <p className="text-ink-muted">{t('refund.eligible')}</p>
                <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t('refund.reason')} <span className="text-ink-faint/80">({tCommon('optional')})</span>
                    </span>
                    <textarea
                        value={panel.refundReason}
                        onChange={panel.handleRefundReasonChange}
                        rows={2}
                        className="mt-1 w-full rounded-lg bg-background px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/15"
                        placeholder={t('refund.reasonPlaceholder')}
                    />
                </label>
                {panel.refundError && <p className="text-xs text-rose-600">{panel.refundError}</p>}
                <button
                    type="submit"
                    disabled={panel.isRequestingRefund}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                    {panel.isRequestingRefund && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {panel.isRequestingRefund ? t('refund.submitting') : t('refund.submit')}
                </button>
            </form>

            <ConfirmActionModal
                open={panel.confirmingRefund}
                title={t('refund.submit')}
                body={t('refund.confirmBody')}
                confirmLabel={panel.refundRetryIn > 0 ? t('actions.retryIn', { seconds: panel.refundRetryIn }) : t('refund.confirmSubmit')}
                cancelLabel={t('refund.confirmCancel')}
                onClose={panel.cancelRefundConfirmation}
                onConfirm={panel.submitRefundRequest}
                isConfirming={panel.isRequestingRefund || panel.refundRetryIn > 0}
            />
        </>
    );
}
