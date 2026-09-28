import { useTranslations } from 'next-intl';

import { OrderWithdrawalRefund } from '@/components/manage/billing/OrderWithdrawalRefund';
import { WithdrawalExcludedOrders } from '@/components/manage/billing/WithdrawalExcludedOrders';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { OrderWithdrawalFlow } from '@/hooks/useOrderWithdrawalFlow';
import { routes } from '@/lib/routes';

// The preview of one withdrawal, then the host's details and an optional reason.
export function OrderWithdrawalDetails({ flow }: { flow: OrderWithdrawalFlow }) {
    const t = useTranslations('EventPlanSettingsPage.orderWithdrawal');
    const tCommon = useTranslations('Common');
    const limits = useContentLimits();
    const { preview, order, storage } = flow;

    if (flow.isLoading) return <p className="text-sm text-ink-muted">{t('loading')}</p>;
    if (flow.loadFailed || !preview || !order) return <p className="text-sm text-rose-600">{t('loadError')}</p>;

    // Refused: the refusal messages are the whole explanation.
    if (!preview.eligible) {
        return (
            <div className="text-sm">
                <p className="text-ink-muted">{t('notEligible')}</p>
                {preview.refusals.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                        {preview.refusals.map((refusal) => (
                            <li key={refusal.code}>{refusal.message}</li>
                        ))}
                    </ul>
                )}
                {flow.error && <p className="mt-2 text-xs text-rose-600">{flow.error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4 text-left text-sm">
            {/* Deadline */}
            {flow.deadlineLabel && <p className="text-xs text-ink-muted">{t('until', { date: flow.deadlineLabel })}</p>}

            {/* Consequences */}
            <div className="space-y-1.5 leading-relaxed">
                {preview.scope === 'EVENT' ? (
                    <p className="font-semibold text-rose-700">{t('eventScope')}</p>
                ) : order.kind === 'UPGRADE' ? (
                    <p className="text-ink">{t('upgradeScope')}</p>
                ) : (
                    <p className="text-xs text-ink-muted">{t('orderScope')}</p>
                )}
                {storage?.over && storage.trimDue && (
                    <p className="font-semibold text-rose-700">{t('storageOver', { over: storage.over, date: storage.trimDue })}</p>
                )}
                {storage && (
                    <p className="text-xs text-ink-muted">
                        {t('storageAfter', { from: storage.from ?? t('unlimited'), to: storage.to ?? t('unlimited'), usage: storage.usage })}
                    </p>
                )}
                {preview.scheduleMovedAfterPayment && <p className="text-xs text-ink-muted">{t('reviewed')}</p>}
                <WithdrawalExcludedOrders orders={preview.excludedOrders} />
            </div>

            {/* Your details */}
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                    <dt className="font-semibold text-ink-faint">{t('name')}</dt>
                    <dd className="mt-0.5 text-ink">{flow.name || '—'}</dd>
                </div>
                <div>
                    <dt className="font-semibold text-ink-faint">{t('email')}</dt>
                    <dd className="mt-0.5 break-all text-ink">{flow.email || '—'}</dd>
                </div>
            </dl>

            {/* Reason */}
            <label className="block">
                <span className="text-xs font-semibold text-ink-faint">
                    {t('reason')} <span className="font-normal">({tCommon('optional')})</span>
                </span>
                <textarea
                    value={flow.reason}
                    onChange={flow.handleReasonChange}
                    rows={2}
                    maxLength={limits.withdrawalReasonMaxLength}
                    placeholder={t('reasonPlaceholder')}
                    className="resize-none mt-1 w-full rounded-md bg-background px-3 py-2 text-sm text-ink border border-primary/15"
                />
            </label>

            {/* Terms */}
            <a
                href={routes.legal.withdrawalTerms(flow.termsVersion)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center text-xs font-semibold text-primary-dark underline underline-offset-2"
            >
                {t('terms')}
            </a>

            {/* Refund */}
            <OrderWithdrawalRefund flow={flow} />

            {flow.error && <p className="text-xs text-rose-600">{flow.error}</p>}
        </div>
    );
}
