'use client';

import { Calendar, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type { AppEventTypeResponseDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getPlanPriceDetails } from '@/lib/planTiers';

type EventOverviewStepProps = {
    title: string;
    eventType: EventTypeConvention;
    eventTypes: AppEventTypeResponseDto[];
    startAt: string;
    plan: PlanTierResponseDto;
    error: string | null;
    hasDraft: boolean;
};

export function EventOverviewStep({ title, eventType, eventTypes, startAt, plan, error, hasDraft }: EventOverviewStepProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const planActivation = getPlanPriceDetails(plan);
    const activationTotalLabel = planActivation ? formatMoney(locale, planActivation.amountMinor, planActivation.currency) : t('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const matchedEventType = eventTypes.find((type) => type.eventTypeKey === eventType);
    const eventTypeName = matchedEventType ? eventTypeCopy(matchedEventType.eventTypeKey).name : eventType;

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
                        <span className="text-lg font-bold text-primary-dark">{activationTotalLabel}</span>
                    </div>
                </div>
            </section>

            {/* Error State */}
            {error && (
                <div className="mt-auto rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">
                    <p>{error}</p>
                    {hasDraft && <p className="mt-1 font-semibold">{t('paidModules.openDraft')}</p>}
                </div>
            )}
        </div>
    );
}
