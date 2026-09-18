'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

export function WithdrawalConsentSection({
    requestsImmediateStart,
    acknowledgesWithdrawalTerms,
    staleTerms,
    onRequestsImmediateStartChangeAction,
    onAcknowledgesWithdrawalTermsChangeAction,
}: {
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    staleTerms: boolean;
    onRequestsImmediateStartChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onAcknowledgesWithdrawalTermsChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    // Canonical copy lives under CheckoutReviewPage — this is the one legal-terms
    // namespace, shared by every surface that requires this consent.
    const t = useTranslations('CheckoutReviewPage');

    return (
        <section className="rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="withdrawal-terms-title">
            <h2 id="withdrawal-terms-title" className="text-base font-bold text-ink">
                {t('withdrawalTerms.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('withdrawalTerms.body')}</p>
            <label className="mt-3 flex items-start gap-2.5 text-sm">
                <input
                    type="checkbox"
                    checked={requestsImmediateStart}
                    onChange={onRequestsImmediateStartChangeAction}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                />
                <span>
                    <span className="font-semibold text-ink">{t('withdrawalTerms.requestsImmediateStartLabel')}</span>
                    <span className="block text-xs text-ink-muted">{t('withdrawalTerms.requestsImmediateStartCaption')}</span>
                </span>
            </label>
            <label className="mt-2 flex items-start gap-2.5 text-sm">
                <input
                    type="checkbox"
                    checked={acknowledgesWithdrawalTerms}
                    onChange={onAcknowledgesWithdrawalTermsChangeAction}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                />
                <span>
                    <span className="font-semibold text-ink">{t('withdrawalTerms.acknowledgesWithdrawalTermsLabel')}</span>
                    <span className="block text-xs text-ink-muted">{t('withdrawalTerms.acknowledgesWithdrawalTermsCaption')}</span>
                </span>
            </label>
            {staleTerms && <p className="mt-2 text-xs font-semibold text-rose-600">{t('withdrawalTerms.stale')}</p>}
        </section>
    );
}
