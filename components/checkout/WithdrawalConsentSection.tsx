'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { BusinessPurchaseNotice } from '@/components/checkout/BusinessPurchaseNotice';
import { useCheckoutBuyer } from '@/hooks/useBusinessProfile';
import { routes } from '@/lib/routes';

export function WithdrawalConsentSection({
    bodyKey = 'body',
    requestsImmediateStart,
    acknowledgesWithdrawalTerms,
    staleTerms,
    onRequestsImmediateStartChangeAction,
    onAcknowledgesWithdrawalTermsChangeAction,
}: {
    // The intro names what starts immediately: a plan by default, or a storage pack.
    bodyKey?: 'body' | 'storageBody';
    requestsImmediateStart: boolean;
    acknowledgesWithdrawalTerms: boolean;
    staleTerms: boolean;
    onRequestsImmediateStartChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onAcknowledgesWithdrawalTermsChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    // Canonical copy lives under CheckoutReviewPage — this is the one legal-terms
    // namespace, shared by every surface that requires this consent.
    const t = useTranslations('CheckoutReviewPage');
    const buyer = useCheckoutBuyer();

    // A VIES-confirmed business buyer has no consumer right of withdrawal.
    if (buyer.notice === 'business') {
        return <BusinessPurchaseNotice legalName={buyer.legalName} vatNumber={buyer.vatNumber} staleTerms={staleTerms} />;
    }

    return (
        <section className="rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="withdrawal-terms-title">
            <h2 id="withdrawal-terms-title" className="text-base font-bold text-ink">
                {t('withdrawalTerms.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(`withdrawalTerms.${bodyKey}`)}</p>
            {/* Terms link */}
            <a
                href={routes.legal.withdrawalTerms()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-8 items-center text-xs font-semibold text-primary-dark underline underline-offset-2"
            >
                {t('withdrawalTerms.link')}
            </a>
            {/* Unconfirmed business profile */}
            {(buyer.notice === 'pending' || buyer.notice === 'invalid') && (
                <p className="mt-2 text-xs font-semibold text-amber-700">{t(`businessPurchase.${buyer.notice}`)}</p>
            )}
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
