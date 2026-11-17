'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { FeatureAddonLabel } from '@/components/plan/FeatureAddonLabel';
import type { InvitationAddonCheckout } from '@/hooks/useInvitationAddonStep';
import { formatMoney } from '@/lib/billing';

type PublishAddonStepProps = {
    checkout: InvitationAddonCheckout;
    onCancel: () => void;
};

const ROW_CLASS = 'flex min-h-14 items-center gap-3 py-2';
const CHECKBOX_CLASS = 'h-5 w-5 shrink-0 accent-primary';

// The invitation as an add-on, with RSVP when the invitation asks for replies, then payment.
export function PublishAddonStep({ checkout, onCancel }: PublishAddonStepProps) {
    const t = useTranslations('InvitationEditor');
    const tFeatures = useTranslations('EventAddonsSettingsPage.features');
    const locale = useLocale();
    const { saveMyDate, rsvp } = checkout.step;

    return (
        <form onSubmit={checkout.submit} className="flex flex-col gap-4">
            {/* Title */}
            <h2 className="pr-10 text-base font-semibold">{t('addOnTitle')}</h2>

            {/* Add-ons */}
            <ul className="divide-y divide-ink/10">
                <li>
                    {/* Always included */}
                    <label className={ROW_CLASS}>
                        <input type="checkbox" checked disabled readOnly className={CHECKBOX_CLASS} />
                        <FeatureAddonLabel service={saveMyDate.service} />
                    </label>
                </li>
                {rsvp && (
                    <li>
                        <label className={`${ROW_CLASS} cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-60`}>
                            <input
                                type="checkbox"
                                checked={checkout.rsvpTicked}
                                disabled={checkout.isPending}
                                onChange={checkout.handleRsvpChange}
                                className={CHECKBOX_CLASS}
                            />
                            <FeatureAddonLabel service={rsvp.service} />
                        </label>
                    </li>
                )}
            </ul>

            {/* Total */}
            {checkout.totalMinor !== null && (
                <p className="text-base font-bold tabular-nums">
                    {tFeatures('total', { amount: formatMoney(locale, checkout.totalMinor, checkout.currency) })}
                </p>
            )}

            {/* Consent */}
            <WithdrawalConsentSection
                bodyKey="addonsBody"
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
