'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { EventTypeConvention, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { getModuleMeta } from '@/lib/planModules';
import { getPlanPriceDetails } from '@/lib/planTiers';

type EventOverviewStepProps = {
    title: string;
    eventType: EventTypeConvention;
    startAt: string;
    endAt: string;
    locationName: string;
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    addons: PaidServiceResponseDto[];
    error: string | null;
    hasDraft: boolean;
};

export function EventOverviewStep({
    title,
    eventType,
    startAt,
    endAt,
    locationName,
    plan,
    modules,
    addons,
    error,
    hasDraft,
}: EventOverviewStepProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const includedMonths = plan.includedMonths ?? 1;
    const planActivation = getPlanPriceDetails(plan, 'activation');
    const planRenewal = getPlanPriceDetails(plan, 'recurring');
    const recurringAddons = addons.filter((addon) => addon.billingPeriod === 'MONTHLY');
    const oneTimeAddons = addons.filter((addon) => addon.billingPeriod === 'ONE_TIME');
    const activationAddonTotal =
        recurringAddons.reduce((sum, addon) => sum + addon.priceAmountMinor * includedMonths, 0) +
        oneTimeAddons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
    const monthlyAddonTotal = recurringAddons.reduce((sum, addon) => sum + addon.priceAmountMinor, 0);
    const currency = planActivation?.currency ?? planRenewal?.currency ?? addons[0]?.priceCurrency;
    const activationTotal = planActivation ? planActivation.amountMinor + activationAddonTotal : activationAddonTotal;
    const renewalTotal = (planRenewal?.amountMinor ?? 0) + monthlyAddonTotal;
    const activationTotalLabel = currency ? formatMoney(locale, activationTotal, currency) : t('payment.noCharge');
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="flex h-full flex-col gap-5">
            {/* Intro */}
            <section>
                <h2 className="text-lg font-bold text-ink">{t('overview.title')}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{t('overview.body')}</p>
            </section>

            {/* Event Summary */}
            <section className="rounded-xl bg-surface-muted px-4 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('overview.event')}</h3>
                <p className="mt-2 font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-ink-muted">
                    {t(`eventTypes.${eventType}`)} · {dateFormatter.format(new Date(startAt))} – {dateFormatter.format(new Date(endAt))}
                </p>
                {locationName && <p className="mt-1 text-sm text-ink-muted">{locationName}</p>}
            </section>

            {/* Pricing */}
            <section aria-labelledby="pricing-heading">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <h3 id="pricing-heading" className="font-bold text-ink">
                            {t('overview.pricing')}
                        </h3>
                        <p className="mt-1 text-xs text-ink-muted">{t('overview.pricingHint', { months: includedMonths })}</p>
                    </div>
                </div>
                <div className="mt-3 divide-y divide-border/70">
                    <PriceRow
                        label={plan.name}
                        detail={t('overview.planActivation')}
                        amount={planActivation && formatMoney(locale, planActivation.amountMinor, planActivation.currency)}
                        fallback={t('payment.noCharge')}
                    />
                    {addons.map((addon) => {
                        const name = addon.grantsModuleKey ? getModuleMeta(addon.grantsModuleKey, modules).name : addon.name;
                        const activationAmount =
                            addon.billingPeriod === 'ONE_TIME' ? addon.priceAmountMinor : addon.priceAmountMinor * includedMonths;
                        return (
                            <PriceRow
                                key={addon.id}
                                label={name}
                                detail={
                                    addon.billingPeriod === 'ONE_TIME'
                                        ? t('overview.chargedOnce')
                                        : t('overview.monthlyForMonths', { months: includedMonths })
                                }
                                amount={formatMoney(locale, activationAmount, addon.priceCurrency)}
                                fallback={t('payment.noCharge')}
                            />
                        );
                    })}
                    <div className="flex items-center justify-between gap-3 py-4 text-base font-bold text-ink">
                        <span>{t('overview.dueNow')}</span>
                        <span>{activationTotalLabel}</span>
                    </div>
                </div>
            </section>

            {/* Recurring Cost */}
            <section className="rounded-xl bg-primary-light px-4 py-3 text-sm text-primary-dark">
                <div className="flex items-center justify-between gap-3 font-semibold">
                    <span>{t('overview.futureMonthly')}</span>
                    <span>{currency ? formatMoney(locale, renewalTotal, currency) : t('payment.noCharge')}</span>
                </div>
                <p className="mt-1 text-xs leading-5">{t('overview.futureMonthlyHint', { months: includedMonths })}</p>
            </section>

            {/* Error State */}
            {error && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">
                    <p>{error}</p>
                    {hasDraft && <p className="mt-1 font-semibold">{t('paidModules.openDraft')}</p>}
                </div>
            )}
        </div>
    );
}

function PriceRow({ label, detail, amount, fallback }: { label: string; detail: string; amount: string | null; fallback: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 text-sm">
            <div>
                <p className="font-semibold text-ink">{label}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{detail}</p>
            </div>
            <span className="shrink-0 font-semibold text-ink">{amount ?? fallback}</span>
        </div>
    );
}
