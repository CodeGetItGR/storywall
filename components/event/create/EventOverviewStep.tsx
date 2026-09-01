'use client';

import { Calendar, CheckCircle2, Loader2, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { AppEventTypeResponseDto, CollaborationCodePreviewResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getPlanPriceDetails } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type EventOverviewStepProps = {
    title: string;
    eventType: EventTypeConvention;
    eventTypes: AppEventTypeResponseDto[];
    startAt: string;
    plan: PlanTierResponseDto;
    error: string | null;
    hasDraft: boolean;
    checkoutCode: string;
    appliedCheckoutCode: string | null;
    checkoutCodePreview: CollaborationCodePreviewResponseDto | null;
    checkoutCodeError: string | null;
    isCheckingCheckoutCode: boolean;
    onCheckoutCodeChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onApplyCheckoutCodeAction: () => void;
};

export function EventOverviewStep({
    title,
    eventType,
    eventTypes,
    startAt,
    plan,
    error,
    hasDraft,
    checkoutCode,
    appliedCheckoutCode,
    checkoutCodePreview,
    checkoutCodeError,
    isCheckingCheckoutCode,
    onCheckoutCodeChangeAction,
    onApplyCheckoutCodeAction,
}: EventOverviewStepProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const planActivation = getPlanPriceDetails(plan);
    const activationTotalLabel = planActivation ? formatMoney(locale, planActivation.amountMinor, planActivation.currency) : t('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const matchedEventType = eventTypes.find((type) => type.eventTypeKey === eventType);
    const eventTypeName = matchedEventType ? eventTypeCopy(matchedEventType.eventTypeKey).name : eventType;
    const trimmedCheckoutCode = checkoutCode.trim();
    const codeApplied = Boolean(appliedCheckoutCode && checkoutCodePreview);
    const previewAmount = checkoutCodePreview ? formatMoney(locale, checkoutCodePreview.payableAmountMinor, checkoutCodePreview.currency) : null;
    const finalTotalLabel = previewAmount ?? activationTotalLabel;

    return (
        <div className="flex h-full flex-col">
            {/* Event Summary */}
            <section aria-labelledby="plan-details-heading" className="flex items-start gap-3 border-b border-border/70 pb-5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />

                <div className="min-w-0">
                    <h3 id="plan-details-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t('overview.event')}
                    </h3>

                    <p className="mt-1 font-semibold text-ink">{title}</p>

                    <p className="mt-0.5 text-sm text-ink-muted">
                        {eventTypeName} · {dateFormatter.format(new Date(startAt))}
                    </p>
                </div>
            </section>

            {/* Pricing */}
            <section aria-labelledby="pricing-heading" className="border-b border-border/70 py-5">
                <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-ink-faint" />
                    <h3 id="pricing-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                        {t('overview.pricing')}
                    </h3>
                </div>

                <p className="mt-1 text-xs text-ink-muted">{t('overview.pricingHint')}</p>

                <div className="mt-3 divide-y divide-border/70">
                    <EventOverviewPriceRow
                        label={plan.name}
                        detail={t('overview.planActivation')}
                        amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                        fallback={t('payment.noCharge')}
                    />

                    <div className="flex items-center justify-between gap-3 pt-4">
                        <span className="text-sm font-semibold text-ink">{t('overview.dueNow')}</span>
                        <span className="text-lg font-bold text-primary-dark">{finalTotalLabel}</span>
                    </div>
                </div>
            </section>

            {/* Checkout code */}
            <section aria-labelledby="checkout-code-heading" className="py-5">
                <h3 id="checkout-code-heading" className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
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
                        aria-describedby={checkoutCodeError ? 'event-checkout-code-error' : codeApplied ? 'event-checkout-code-success' : undefined}
                        placeholder={t('collaboration.placeholder')}
                        className={cn(
                            'min-h-11 flex-1 rounded-full border bg-card px-4 text-sm font-semibold text-ink outline-none transition focus:ring-2 disabled:bg-surface-muted disabled:text-ink-muted',
                            checkoutCodeError
                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'
                                : 'border-border focus:border-primary focus:ring-primary/15'
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
                {codeApplied && checkoutCodePreview && (
                    <p id="event-checkout-code-success" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {t('collaboration.applied', { discount: checkoutCodePreview.combinedDiscountPercent })}
                    </p>
                )}
                {checkoutCodeError && (
                    <p id="event-checkout-code-error" className="mt-2 text-sm font-semibold text-rose-600">
                        {checkoutCodeError}
                    </p>
                )}
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
