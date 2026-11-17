'use client';

import { Loader2, LockKeyhole } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { FeatureAddonLabel } from '@/components/plan/FeatureAddonLabel';
import type { FeatureAddons } from '@/hooks/useFeatureAddons';
import { formatMoney } from '@/lib/billing';

// A live event ticks the features it wants and pays for them in one payment.
export function FeatureAddonCheckout({
    state,
}: {
    state: Pick<
        FeatureAddons,
        | 'offers'
        | 'selectedCodes'
        | 'pickedCount'
        | 'totalMinor'
        | 'currency'
        | 'consent'
        | 'canPurchase'
        | 'paused'
        | 'canPay'
        | 'isPaying'
        | 'handleToggleChange'
        | 'handlePayClick'
    >;
}) {
    const t = useTranslations('EventAddonsSettingsPage.features');
    const locale = useLocale();
    const amount = formatMoney(locale, state.totalMinor, state.currency);
    const disabled = !state.canPurchase || state.paused;

    return (
        <div>
            {/* Add-ons */}
            <ul className="mt-4 divide-y divide-ink/10">
                {state.offers.map(({ service }) => (
                    <li key={service.id}>
                        <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2 has-disabled:cursor-not-allowed has-disabled:opacity-60">
                            <input
                                type="checkbox"
                                checked={state.selectedCodes.has(service.code)}
                                disabled={disabled}
                                data-service-code={service.code}
                                onChange={state.handleToggleChange}
                                className="h-5 w-5 shrink-0 accent-primary"
                            />
                            <FeatureAddonLabel service={service} />
                        </label>
                    </li>
                ))}
            </ul>

            {/* Total, consent and payment */}
            {state.pickedCount > 0 && !state.paused && (
                <>
                    <p className="mt-4 text-base font-bold text-ink tabular-nums">{t('total', { amount })}</p>

                    <div className="mt-4">
                        <WithdrawalConsentSection
                            bodyKey="addonsBody"
                            requestsImmediateStart={state.consent.requestsImmediateStart}
                            acknowledgesWithdrawalTerms={state.consent.acknowledgesWithdrawalTerms}
                            staleTerms={state.consent.staleTerms}
                            onRequestsImmediateStartChangeAction={state.consent.handleRequestsImmediateStartChange}
                            onAcknowledgesWithdrawalTermsChangeAction={state.consent.handleAcknowledgesWithdrawalTermsChange}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={state.handlePayClick}
                        disabled={!state.canPay}
                        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        {state.isPaying ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        )}
                        {t('pay', { amount })}
                    </button>
                </>
            )}
        </div>
    );
}
