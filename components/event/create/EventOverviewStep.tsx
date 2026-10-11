'use client';

import { Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { ActivationDisclosures } from '@/components/checkout/ActivationDisclosures';
import { ActivationEventSummary } from '@/components/checkout/ActivationEventSummary';
import { PartnerBrandingNotice } from '@/components/checkout/PartnerBrandingNotice';
import { WithdrawalConsentSection } from '@/components/checkout/WithdrawalConsentSection';
import { EventOverviewDiscountCode } from '@/components/event/create/EventOverviewDiscountCode';
import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { formatMoney } from '@/lib/billing';
import { getOptionPriceDetails } from '@/lib/planTiers';
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
        appliedCheckoutCode,
        checkoutCodePreview,
        requestsImmediateStart,
        acknowledgesWithdrawalTerms,
        staleTerms,
        onRequestsImmediateStartChange: onRequestsImmediateStartChangeAction,
        onAcknowledgesWithdrawalTermsChange: onAcknowledgesWithdrawalTermsChangeAction,
        partnerBrandingNotice,
        partnerBrandingAccepted,
        onPartnerBrandingChange: onPartnerBrandingChangeAction,
    } = useCreateEventForm();

    if (!plan || !option) return null;

    const planActivation = getOptionPriceDetails(plan, option);
    const activationTotalLabel = planActivation ? formatMoney(locale, planActivation.amountMinor, planActivation.currency) : t('payment.noCharge');
    const matchedEventType = eventTypes.find((type) => type.eventTypeKey === eventType);
    const eventTypeName = matchedEventType ? eventTypeCopy(matchedEventType.eventTypeKey).name : eventType;
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
            <EventOverviewDiscountCode />

            {/* Partner credit */}
            {partnerBrandingNotice && (
                <div className="border-t border-border/70 pt-5">
                    <PartnerBrandingNotice
                        notice={partnerBrandingNotice}
                        accepted={partnerBrandingAccepted}
                        onChangeAction={onPartnerBrandingChangeAction}
                    />
                </div>
            )}

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
        </div>
    );
}
