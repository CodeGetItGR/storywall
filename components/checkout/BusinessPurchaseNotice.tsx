'use client';

import { useTranslations } from 'next-intl';

// Shown before redirecting to Stripe in place of the consumer withdrawal text
// (business-buyers-fe-integration.md §3). Same wording as the Stripe page footer.
// Reuses the consent section's heading id, since callers label their wrapper with it.
export function BusinessPurchaseNotice({ legalName, vatNumber, staleTerms }: { legalName: string; vatNumber: string; staleTerms: boolean }) {
    const t = useTranslations('CheckoutReviewPage');

    return (
        <section className="rounded-lg border border-border bg-surface-muted/40 p-4" aria-labelledby="withdrawal-terms-title">
            {/* Business purchase */}
            <h2 id="withdrawal-terms-title" className="text-base font-bold text-ink">
                {t('businessPurchase.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('businessPurchase.notice', { legalName, vatNumber })}</p>
            {staleTerms && <p className="mt-2 text-xs font-semibold text-rose-600">{t('withdrawalTerms.stale')}</p>}
        </section>
    );
}
