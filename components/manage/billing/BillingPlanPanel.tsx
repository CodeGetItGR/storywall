import { PackagePlus } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { PlanUpgradeDiff } from '@/components/manage/billing/PlanUpgradeDiff';
import Section from '@/components/manage/Section';
import { type BillingData, type BillingDerived, type BillingInsights } from '@/hooks/useEventBillingPanel';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto, UpgradeOptionResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

export function BillingPlanPanel({
    eventId,
    data,
    derived,
    insights,
    currentPlan,
    nextUpgradeOption,
    nextUpgradePlan,
    platformModules,
    paidAddonOffers,
}: {
    eventId: string;
    data: BillingData;
    derived: BillingDerived;
    insights: BillingInsights;
    currentPlan: PlanTierResponseDto | null;
    nextUpgradeOption: UpgradeOptionResponseDto | null;
    nextUpgradePlan: PlanTierResponseDto | null;
    platformModules: PlatformModuleResponseDto[];
    paidAddonOffers: PaidServiceResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const { upgradeAmount, upgradeListAmount, upgradeCurrency } = derived;

    const upgradeDueLabel = upgradeAmount !== null ? formatMoney(locale, upgradeAmount, upgradeCurrency) : null;
    const upgradeListDueLabel =
        upgradeListAmount !== null && upgradeAmount !== null && upgradeAmount !== upgradeListAmount
            ? formatMoney(locale, upgradeListAmount, upgradeCurrency)
            : null;
    return (
        <div className="flex flex-col gap-5">
            {/* Active add-ons */}
            {data.addons.length > 0 && (
                <Section title={t('addons.title')}>
                    <div className="flex flex-wrap gap-2">
                        {data.addons.map((addon, index) => (
                            <span
                                key={`${addon.code}-${addon.activatedAt}-${index}`}
                                className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-dark"
                            >
                                {addon.billingPeriod === 'ONE_TIME'
                                    ? t('addons.itemOnce', {
                                          name: addon.name,
                                          price: formatMoney(locale, addon.priceAmountMinor, insights.orderCurrency),
                                      })
                                    : t('addons.item', {
                                          name: addon.name,
                                          price: formatMoney(locale, addon.priceAmountMinor, insights.orderCurrency),
                                      })}
                            </span>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                        {t('addons.ownedTotal', {
                            amount: formatMoney(locale, derived.addonTotal, currentPlan?.priceCurrency ?? insights.orderCurrency),
                        })}
                    </p>
                </Section>
            )}

            {/* Upgrade */}
            {nextUpgradeOption && (
                <Section divider>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-ink">{t('compare.upgradeTitle', { plan: nextUpgradeOption.planTierName })}</h3>
                            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
                                {t('compare.upgradeSubtitle', { plan: data.planTierName })}
                            </p>
                        </div>
                    </div>
                    <PlanUpgradeDiff currentPlan={currentPlan} targetPlan={nextUpgradePlan} modules={platformModules} />
                    {/* Upgrade payment */}
                    <div className="mt-5 flex flex-col gap-4 rounded-xl bg-primary-light/55 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t('compare.upgradePriceLabel')}</p>
                            {upgradeDueLabel ? (
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="text-3xl font-bold text-primary-dark tabular-nums">{upgradeDueLabel}</span>
                                    {upgradeListDueLabel && (
                                        <span className="text-sm font-semibold text-ink-faint">
                                            <span className="line-through">{upgradeListDueLabel}</span>
                                            {derived.upgradeDiscountLabel && <span className="ml-1.5">{derived.upgradeDiscountLabel}</span>}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-1 text-sm font-semibold text-ink">{t('compare.upgradeChargeUnavailable')}</p>
                            )}
                            <p className="mt-1 text-sm text-ink-muted">
                                <span className="font-semibold text-ink">{data.planTierName}</span> {t('compare.to')}{' '}
                                <span className="font-semibold text-ink">{nextUpgradeOption.planTierName}</span>
                            </p>
                        </div>
                        {upgradeDueLabel && (
                            <Link
                                href={routes.events.checkoutReview(eventId, 'upgrade', nextUpgradeOption.planTierCode)}
                                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                {t('compare.upgradeButton', { plan: nextUpgradeOption.planTierName, amount: upgradeDueLabel })}
                            </Link>
                        )}
                    </div>
                </Section>
            )}

            {/* Manage add-ons */}
            {data.eventStatus === 'ACTIVE' && paidAddonOffers.length > 0 && (
                <Section divider className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <PackagePlus className="mt-0.5 h-5 w-5 shrink-0 text-primary-dark" aria-hidden="true" />
                        <div>
                            <h3 className="text-sm font-bold text-ink">{t('addons.manageTitle')}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t('addons.manageBody')}</p>
                        </div>
                    </div>
                    <Link
                        href={routes.events.settingsAddons(eventId)}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-surface-muted px-4 text-xs font-semibold text-ink"
                    >
                        {t('addons.manageAction')}
                    </Link>
                </Section>
            )}
        </div>
    );
}
