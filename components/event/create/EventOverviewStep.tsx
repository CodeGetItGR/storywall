'use client';

import { useLocale, useTranslations } from 'next-intl';

import { EventOverviewPriceRow } from '@/components/event/create/EventOverviewPriceRow';
import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import type {
    AppEventTypeResponseDto,
    EventTypeConvention,
    PaidServiceResponseDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getModuleMeta } from '@/lib/planModules';
import { getPlanPriceDetails } from '@/lib/planTiers';

type EventOverviewStepProps = {
    title: string;
    eventType: EventTypeConvention;
    eventTypes: AppEventTypeResponseDto[];
    startAt: string;
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    addons: PaidServiceResponseDto[];
    error: string | null;
    hasDraft: boolean;
};

export function EventOverviewStep({ title, eventType, eventTypes, startAt, plan, modules, addons, error, hasDraft }: EventOverviewStepProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const eventTypeCopy = useLocalizedAppEventTypeCopy();
    const planActivation = getPlanPriceDetails(plan);
    const activationAddonTotal = addons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
    const currency = planActivation?.currency ?? addons[0]?.priceCurrency;
    const activationTotal = planActivation ? planActivation.amountMinor + activationAddonTotal : activationAddonTotal;
    const activationTotalLabel = currency ? formatMoney(locale, activationTotal, currency) : t('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const matchedEventType = eventTypes.find((type) => type.eventTypeKey === eventType);
    const eventTypeName = matchedEventType ? eventTypeCopy(matchedEventType.eventTypeKey).name : eventType;

    return (
        <div className="flex h-full flex-col">
            {/* Event Summary */}
            <section aria-labelledby="plan-details-heading" className="border-b border-border/70 pb-5">
                <h3 id="plan-details-heading" className="font-bold text-ink">
                    {t('overview.event')}
                </h3>

                <p className="mt-2 font-semibold text-ink">{title}</p>

                <p className="mt-1 text-sm text-ink-muted">
                    {eventTypeName} · {dateFormatter.format(new Date(startAt))}
                </p>
            </section>

            {/* Pricing */}
            <section aria-labelledby="pricing-heading" className="border-b border-border/70 py-5">
                <h3 id="pricing-heading" className="font-bold text-ink">
                    {t('overview.pricing')}
                </h3>

                <p className="mt-1 text-xs text-ink-muted">{t('overview.pricingHint')}</p>

                <div className="mt-3 divide-y divide-border/70">
                    <EventOverviewPriceRow
                        label={plan.name}
                        detail={t('overview.planActivation')}
                        amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                        fallback={t('payment.noCharge')}
                    />

                    {addons.map((addon) => {
                        const name = addon.grantsModuleKey ? getModuleMeta(addon.grantsModuleKey, modules).name : addon.name;

                        return (
                            <EventOverviewPriceRow
                                key={addon.id}
                                label={name}
                                detail={t('overview.chargedOnce')}
                                amount={formatMoney(locale, addon.priceAmountMinor, addon.priceCurrency)}
                                fallback={t('payment.noCharge')}
                            />
                        );
                    })}

                    <div className="flex items-center justify-between gap-3 pt-4 text-base font-bold text-ink">
                        <span>{t('overview.dueNow')}</span>
                        <span>{activationTotalLabel}</span>
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
