'use client';

import { Loader2, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActivationDisclosures } from '@/components/checkout/ActivationDisclosures';
import { ActivationEventSummary } from '@/components/checkout/ActivationEventSummary';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { formatMoney } from '@/lib/billing';
import { getOptionPriceDetails } from '@/lib/planTiers';
import { cn } from '@/lib/utils';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

export function EventOverviewStep() {
    const t = useTranslations('CreateEventPage');
    const tDurations = useTranslations('Durations');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const {
        trimmedTitle: title,
        selectedEventType: eventType,
        eventTypes,
        startAt,
        projectedCoverage,
        selectedPlan: plan,
        selectedOption: option,
        error,
        hasDraft,
        checkoutCode,
        appliedCheckoutCode,
        checkoutCodePreview,
        checkoutCodeError,
        isCheckingCheckoutCode,
        onCheckoutCodeChange: onCheckoutCodeChangeAction,
        applyCheckoutCode: onApplyCheckoutCodeAction,
        requestsImmediateStart,
        acknowledgesWithdrawalTerms,
        staleTerms,
        onRequestsImmediateStartChange: onRequestsImmediateStartChangeAction,
        onAcknowledgesWithdrawalTermsChange: onAcknowledgesWithdrawalTermsChangeAction,
    } = useCreateEventForm();

    if (!plan || !option) return null;

    const planActivation = getOptionPriceDetails(plan, option);
    const activationTotalLabel = planActivation ? formatMoney(locale, planActivation.amountMinor, planActivation.currency) : t('payment.noCharge');
    const matchedEventType = eventTypes.find((type) => type.eventTypeKey === eventType);
    const eventTypeName = matchedEventType ? eventTypeCopy(matchedEventType.eventTypeKey).name : eventType;
    const trimmedCheckoutCode = checkoutCode.trim();
    const codeApplied = Boolean(appliedCheckoutCode && checkoutCodePreview);
    const previewAmount = checkoutCodePreview ? formatMoney(locale, checkoutCodePreview.payableAmountMinor, checkoutCodePreview.currency) : null;
    const finalTotalLabel = previewAmount ?? activationTotalLabel;
    const discountAmountLabel =
        codeApplied && checkoutCodePreview && planActivation
            ? `-${formatMoney(locale, planActivation.amountMinor - checkoutCodePreview.payableAmountMinor, checkoutCodePreview.currency)}`
            : null;

    return (
        <div className="flex h-full flex-col">
            {/* Event Summary */}
            <div className="border-b border-border/70 pb-5">
                <ActivationEventSummary eventTitle={title} eventTypeName={eventTypeName} startAt={startAt} />
            </div>

            {/* Pricing */}
            <section aria-labelledby="pricing-heading" className="border-b border-border/70 py-5">
                <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-ink-faint" />
                    <h3 id="pricing-heading" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                        {t('overview.pricing')}
                    </h3>
                </div>

                <p className="mt-1 text-xs text-ink-muted">{t('overview.pricingHint')}</p>

                <div className="mt-3 divide-y divide-border/70">
                    <EventOverviewPriceRow
                        label={plan.name}
                        detail={t('overview.planActivationFor', { duration: tDurations('months', { count: option.months }) })}
                        amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                        fallback={t('payment.noCharge')}
                    />

                    {discountAmountLabel && checkoutCodePreview && (
                        <EventOverviewPriceRow
                            label={t('overview.discount')}
                            detail={t('overview.discountDetail', {
                                label: checkoutCodePreview.label,
                                percent: checkoutCodePreview.combinedDiscountPercent,
                            })}
                            amount={discountAmountLabel}
                            fallback={discountAmountLabel}
                            amountClassName="text-emerald-700"
                        />
                    )}

                    <div className="flex items-center justify-between gap-3 pt-4">
                        <span className="text-sm font-semibold text-ink">{t('overview.dueNow')}</span>
                        <span className="text-lg font-bold text-primary-dark">{finalTotalLabel}</span>
                    </div>
                </div>
            </section>

            {/* Checkout code */}
            <section aria-labelledby="checkout-code-heading" className="py-5">
                <h3 id="checkout-code-heading" className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    {t('collaboration.title')}
                </h3>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="event-checkout-code">
                        {t('collaboration.field')}
                    </label>
                    <input
                        id="event-checkout-code"
                        value={checkoutCode}
                        onChange={onCheckoutCodeChangeAction}
                        maxLength={40}
                        autoComplete="off"
                        disabled={codeApplied}
                        aria-invalid={Boolean(checkoutCodeError)}
                        aria-describedby={checkoutCodeError ? 'event-checkout-code-error' : undefined}
                        placeholder={t('collaboration.placeholder')}
                        className={cn(
                            'min-h-11 flex-1 rounded-full border bg-card px-4 text-sm font-semibold text-ink transition outline-none focus:ring-2 disabled:bg-surface-muted disabled:text-ink-muted',
                            checkoutCodeError
                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                                : 'border-border focus:border-primary focus:ring-primary/15',
                        )}
                    />
                    <button
                        type="button"
                        disabled={!trimmedCheckoutCode || codeApplied || isCheckingCheckoutCode}
                        onClick={onApplyCheckoutCodeAction}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold text-ink shadow-sm ring-1 ring-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isCheckingCheckoutCode && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {isCheckingCheckoutCode ? t('collaboration.checking') : t('collaboration.apply')}
                    </button>
                </div>
                {checkoutCodeError && (
                    <p id="event-checkout-code-error" className="mt-2 text-sm font-semibold text-rose-600">
                        {checkoutCodeError}
                    </p>
                )}
            </section>

            {/* Activation disclosures */}
            <div className="border-t border-border/70 py-5">
                <ActivationDisclosures projectedCoverage={projectedCoverage} />
            </div>

            {/* Withdrawal consent */}
            <section aria-labelledby="withdrawal-terms-title" className="border-t border-border/70 pt-5">
                <WithdrawalConsentSection
                    requestsImmediateStart={requestsImmediateStart}
                    acknowledgesWithdrawalTerms={acknowledgesWithdrawalTerms}
                    staleTerms={staleTerms}
                    onRequestsImmediateStartChangeAction={onRequestsImmediateStartChangeAction}
                    onAcknowledgesWithdrawalTermsChangeAction={onAcknowledgesWithdrawalTermsChangeAction}
                />
            </section>

            {/* Error State */}
            {error && (
                <div className="mt-auto rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">
                    <p>{error}</p>
                    {hasDraft && <p className="mt-1 font-semibold">{t('paidModules.openSetup')}</p>}
                </div>
            )}
        </div>
    );
}
