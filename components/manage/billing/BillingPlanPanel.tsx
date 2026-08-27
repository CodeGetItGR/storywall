import { PackagePlus } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import Section from '@/components/manage/Section';
import { type BillingData, type BillingDerived, type BillingInsights } from '@/hooks/useEventBillingPanel';
import type { PaidServiceResponseDto, PlanTierResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { routes } from '@/lib/routes';

export function BillingPlanPanel({
    eventId,
    data,
    derived,
    insights,
    currentPlan,
    nextPlan,
    paidAddonOffers,
}: {
    eventId: string;
    data: BillingData;
    derived: BillingDerived;
    insights: BillingInsights;
    currentPlan: PlanTierResponseDto | null;
    nextPlan: PlanTierResponseDto | null;
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
    const upgradeChargeLabel = upgradeDueLabel ? t('compare.upgradeChargeNoDate', { amount: upgradeDueLabel }) : null;

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
            {nextPlan && currentPlan && (
                <Section divider>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-ink">{t('compare.upgradeTitle', { plan: nextPlan.name })}</h3>
                            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">
                                {t('compare.upgradeSubtitle', { plan: data.planTierName })}
                            </p>
                        </div>
                        <Link
                            href={routes.plans({ eventId, plan: data.planTierCode })}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink-muted hover:text-ink"
                        >
                            {t('compare.allPlansTitle')}
                        </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{currentPlan.name}</span>
                        <span className="text-ink-faint">{t('compare.to')}</span>
                        <span className="font-semibold text-ink">{nextPlan.name}</span>
                        <span className="text-ink-faint">-</span>
                        <span>
                            {upgradeChargeLabel ?? t('compare.upgradeChargeUnavailable')}
                            {upgradeListDueLabel && (
                                <span className="ml-2 text-xs font-semibold text-ink-faint">
                                    <span className="line-through">{upgradeListDueLabel}</span>
                                    {nextPlan.discountLabel && <span className="ml-1">{nextPlan.discountLabel}</span>}
                                </span>
                            )}
                        </span>
                        {upgradeDueLabel && (
                            <Link
                                href={routes.events.checkoutReview(eventId, 'upgrade', nextPlan.code)}
                                className="inline-flex min-h-10 items-center rounded-full bg-surface-muted px-3 text-xs font-semibold text-ink"
                            >
                                {t('actions.upgradeTo', { plan: nextPlan.name })}
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
