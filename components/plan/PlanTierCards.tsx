'use client';

import { CalendarDays, Database, ImageIcon, Percent, Users } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { PlanComparisonBadges } from '@/components/plan/PlanComparisonBadges';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { PlanUpgradeButton } from '@/components/plan/PlanUpgradeButton';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { isPlanDiscountActive } from '@/lib/billing';
import { formatPlanDiscount, mediaEstimate } from '@/lib/planComparison';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type PlanTierCardsProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlanCode?: string | null;
    currentPlan?: PlanTierResponseDto | null;
    isCheckoutPending?: boolean;
    nextPlanId?: string | null;
    onUpgrade?: (planTierCode: string) => void;
    pendingPlanCode?: string | null;
    retryIn?: number;
    upgradeTargets?: PlanTierResponseDto[];
};

export function PlanTierCards({
    plans,
    modules,
    currentPlanCode,
    currentPlan,
    isCheckoutPending = false,
    nextPlanId,
    onUpgrade,
    pendingPlanCode = null,
    retryIn = 0,
    upgradeTargets = [],
}: PlanTierCardsProps) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const localizedPlanDescription = useLocalizedPlanDescription();
    const upgradeTargetCodes = new Set(upgradeTargets.map((target) => target.code));

    return (
        <div className="space-y-6">
            {plans.map((plan) => {
                const isCurrent = Boolean(currentPlanCode) && plan.code === currentPlanCode;
                const isNext = nextPlanId === plan.id;
                const discount = formatPlanDiscount(plan);
                const media = mediaEstimate(plan.storageBytes);
                const hasActiveDiscount = isPlanDiscountActive(plan);
                const canUpgradeToPlan = Boolean(currentPlan && onUpgrade && upgradeTargetCodes.has(plan.code));

                return (
                    <article
                        key={plan.id}
                        className={cn(
                            'flex flex-col',
                            isCurrent && 'rounded-lg p-3 ring-2 ring-ink',
                            isNext && !isCurrent && 'rounded-lg bg-primary-light/20 p-3 ring-1 ring-primary/20'
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold text-ink">{plan.name}</h2>
                                <p className="mt-1 text-sm leading-5 text-ink-muted">{localizedPlanDescription(plan)}</p>
                            </div>
                            <PlanComparisonBadges isCurrent={isCurrent}/>
                        </div>

                        <div className="mt-4 grid gap-2 rounded-lg bg-surface-muted/55 p-3 min-[420px]:grid-cols-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('compare.activationPrice')}</p>
                                <PlanPriceLabel
                                    plan={plan}
                                    kind="activation"
                                    locale={locale}
                                    fallback={t('compare.noPrice')}
                                    className="block text-xl font-bold text-ink"
                                />
                                <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                                    {plan.billingPeriod ? t(`billingPeriod.${plan.billingPeriod}`) : t('compare.noBilling')}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('compare.monthlyPrice')}</p>
                                <PlanPriceLabel
                                    plan={plan}
                                    kind="recurring"
                                    locale={locale}
                                    fallback={t('compare.noMonthlyPrice')}
                                    suffix={t('compare.perMonthSuffix')}
                                    className="block text-base font-bold text-ink"
                                />
                            </div>
                        </div>

                        <dl className="mt-3 grid gap-x-4 gap-y-3 min-[420px]:grid-cols-2">
                            <PlanTierMetric
                                icon={<Database className="h-4 w-4" />}
                                label={t('compare.storage')}
                                value={formatLimitValue(plan.storageBytes, 'bytes') ?? t('compare.unlimited')}
                            />
                            <PlanTierMetric
                                icon={<Users className="h-4 w-4" />}
                                label={t('compare.members')}
                                value={formatLimitValue(plan.maxMembers, 'count') ?? t('compare.unlimited')}
                            />
                            <PlanTierMetric
                                icon={<CalendarDays className="h-4 w-4" />}
                                label={t('compare.includedMonths')}
                                value={
                                    plan.includedMonths === null
                                        ? t('compare.noCoverageLimit')
                                        : t('compare.monthCount', { count: plan.includedMonths })
                                }
                            />
                            <PlanTierMetric
                                icon={<ImageIcon className="h-4 w-4" />}
                                label={t('compare.mediaCapacity')}
                                value={
                                    media ? t('compare.mediaEstimate', { images: media.images, videos: media.videos }) : t('compare.unlimitedMedia')
                                }
                            />
                            {hasActiveDiscount && (
                                <PlanTierMetric icon={<Percent className="h-4 w-4" />} label={t('compare.discount')} value={discount} />
                            )}
                        </dl>

                        <div className="mt-auto pt-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('compare.modules')}</p>
                            <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />
                        </div>

                        {canUpgradeToPlan && currentPlan && onUpgrade && (
                            <div className="mt-4 rounded-lg bg-surface-muted/45 p-2">
                                <PlanUpgradeButton
                                    currentPlan={currentPlan}
                                    isCheckoutPending={isCheckoutPending}
                                    isPending={isCheckoutPending && pendingPlanCode === plan.code}
                                    onUpgrade={onUpgrade}
                                    retryIn={retryIn}
                                    target={plan}
                                />
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

function PlanTierMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
    return (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
            <div className="mt-0.5 text-primary-dark/80">{icon}</div>
            <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold leading-5 text-ink">{value}</dd>
            </div>
        </div>
    );
}
