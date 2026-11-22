'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { PriceBreakdownSummary } from '@/components/checkout/PriceBreakdownSummary';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { FeatureAddonCheckRow } from '@/components/plan/FeatureAddonCheckRow';
import type { InvitationAddonCheckout } from '@/hooks/useInvitationAddonStep';
import { formatMoney } from '@/lib/billing';

type PublishAddonStepProps = {
    checkout: InvitationAddonCheckout;
    onCancel: () => void;
};

// The invitation as an add-on, with RSVP when the invitation asks for replies, then payment.
// A draft pays its plan with them, so its plan and other add-ons are listed first.
export function PublishAddonStep({ checkout, onCancel }: PublishAddonStepProps) {
    const t = useTranslations('InvitationEditor');
    const tFeatures = useTranslations('EventAddonsSettingsPage.features');
    const locale = useLocale();
    const { saveMyDate, rsvp } = checkout.step;

    return (
        <form onSubmit={checkout.submit} className="flex flex-col gap-4">
            {/* Title */}
            <h2 className="pr-10 text-base font-semibold">{t('addOnTitle')}</h2>

            {/* Draft: the plan and the add-ons already on it */}
            {checkout.draftItems && <PriceBreakdownSummary breakdown={checkout.draftItems} showTotal={false} />}

            {/* Add-ons */}
            <ul className="divide-y divide-ink/10">
                <li>
                    {/* Always included */}
                    <FeatureAddonCheckRow service={saveMyDate.service} checked />
                </li>
                {rsvp && (
                    <li>
                        <FeatureAddonCheckRow
                            service={rsvp.service}
                            checked={checkout.rsvpTicked}
                            disabled={checkout.isPending}
                            onChange={checkout.handleRsvpChange}
                        />
                    </li>
                )}
            </ul>

            {/* Total: a draft's waits for its price */}
            {checkout.totalMinor !== null && (
                <p className="text-base font-bold tabular-nums">
                    {tFeatures('total', { amount: formatMoney(locale, checkout.totalMinor, checkout.currency) })}
                </p>
            )}

            {/* Consent */}
            <WithdrawalConsentSection
                bodyKey={checkout.step.mode === 'draft' ? 'body' : 'addonsBody'}
                requestsImmediateStart={checkout.consent.requestsImmediateStart}
                acknowledgesWithdrawalTerms={checkout.consent.acknowledgesWithdrawalTerms}
                staleTerms={checkout.consent.staleTerms}
                onRequestsImmediateStartChangeAction={checkout.consent.handleRequestsImmediateStartChange}
                onAcknowledgesWithdrawalTermsChangeAction={checkout.consent.handleAcknowledgesWithdrawalTermsChange}
            />

            {/* Error */}
            {checkout.error && (
                <p role="alert" className="font-medium text-rose-700">
                    {checkout.error}
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={checkout.isPending}
                    className="rounded-full bg-surface-muted px-4 py-2 font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={!checkout.canSubmit}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t('continueToPayment')}
                </button>
            </div>
        </form>
    );
}
