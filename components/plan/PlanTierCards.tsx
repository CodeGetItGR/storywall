'use client';

import { CalendarDays, Database, ImageIcon, Percent, RefreshCw, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

import { PlanComparisonBadges } from '@/components/plan/PlanComparisonBadges';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatPlanDiscount, mediaEstimate, PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';
import { formatLimitValue, formatPlanMoney, formatPlanRecurringMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type PlanTierCardsProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlanCode?: string | null;
    nextPlanId?: string | null;
};

export function PlanTierCards({ plans, modules, currentPlanCode, nextPlanId }: PlanTierCardsProps) {
    const t = useTranslations('EventPlanSettingsPage');
    const localizedPlanDescription = useLocalizedPlanDescription();

    return (
        <div className="grid gap-3">
            {plans.map((plan) => {
                const isCurrent = Boolean(currentPlanCode) && plan.code === currentPlanCode;
                const isNext = nextPlanId === plan.id;
                const discount = formatPlanDiscount(plan);
                const media = mediaEstimate(plan.storageBytes);
                const recurringPrice = formatPlanRecurringMoney(plan);

                return (
                    <article
                        key={plan.id}
                        className={cn(
                            'flex flex-col rounded-lg border bg-white p-4 shadow-[0_14px_35px_rgba(36,31,26,0.06)]',
                            isCurrent && 'border-ink shadow-[0_18px_45px_rgba(36,31,26,0.12)]',
                            isNext && !isCurrent && 'border-primary bg-primary-light/20'
                        )}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-bold text-ink">{plan.name}</h2>
                                <p className="mt-1 text-sm leading-6 text-ink-muted">{localizedPlanDescription(plan)}</p>
                            </div>
                            <PlanComparisonBadges isCurrent={isCurrent} isNext={isNext} />
                        </div>

                        <div className="mt-5">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('compare.activationPrice')}</p>
                            <p className="text-2xl font-bold text-ink">{formatPlanMoney(plan) ?? t('compare.noPrice')}</p>
                            <p className="mt-1 text-sm font-semibold text-ink-muted">
                                {plan.billingPeriod ? t(`billingPeriod.${plan.billingPeriod}`) : t('compare.noBilling')}
                            </p>
                        </div>

                        <dl className="mt-5 grid gap-2">
                            <PlanTierMetric
                                icon={<RefreshCw className="h-4 w-4" />}
                                label={t('compare.monthlyPrice')}
                                value={recurringPrice ? t('compare.perMonthValue', { amount: recurringPrice }) : t('compare.noMonthlyPrice')}
                            />
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
                                value={plan.includedMonths === null ? t('compare.noCoverageLimit') : t('compare.monthCount', { count: plan.includedMonths })}
                            />
                            <PlanTierMetric
                                icon={<ImageIcon className="h-4 w-4" />}
                                label={t('compare.mediaCapacity')}
                                value={media ? t('compare.mediaEstimate', { images: media.images, videos: media.videos }) : t('compare.unlimitedMedia')}
                            />
                            <PlanTierMetric
                                icon={<Percent className="h-4 w-4" />}
                                label={t('compare.discount')}
                                value={discount === PLAN_COMPARISON_EMPTY ? t('compare.noDiscount') : discount}
                            />
                        </dl>

                        <div className="mt-auto pt-5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('compare.modules')}</p>
                            <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

function PlanTierMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-md bg-surface-muted/70 px-3 py-2">
            <div className="mt-0.5 text-primary-dark">{icon}</div>
            <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold leading-5 text-ink">{value}</dd>
            </div>
        </div>
    );
}
