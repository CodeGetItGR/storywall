'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useMemo, useState } from 'react';

import { type MatrixRow, PlanComparisonMatrix } from '@/components/plan/PlanComparisonMatrix';
import { PlanModuleGuideButton } from '@/components/plan/PlanModuleGuideButton';
import { PlanModuleGuideModal } from '@/components/plan/PlanModuleGuideModal';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { PlanTierCards } from '@/components/plan/PlanTierCards';
import { PlanUpgradeButton } from '@/components/plan/PlanUpgradeButton';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { mediaEstimate, PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';
import { formatLimitValue } from '@/lib/planTiers';

export function EventPlanComparison({
    plans,
    modules,
    paidServices,
    currentPlanCode,
    currentPlan,
    isCheckoutPending = false,
    onUpgradeAction,
    pendingPlanCode = null,
    retryIn = 0,
    upgradeTargets = [],
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    paidServices: PaidServiceResponseDto[];
    currentPlanCode?: string | null;
    currentPlan?: PlanTierResponseDto | null;
    isCheckoutPending?: boolean;
    onUpgradeAction?: (planTierCode: string) => void;
    pendingPlanCode?: string | null;
    retryIn?: number;
    upgradeTargets?: PlanTierResponseDto[];
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const locale = useLocale();
    const [moduleLegendOpen, setModuleLegendOpen] = useState(false);

    const displayPlans = useMemo(() => [...plans].sort((left, right) => left.sortOrder - right.sortOrder), [plans]);
    const currentIndex = currentPlanCode ? displayPlans.findIndex((plan) => plan.code === currentPlanCode) : -1;
    const nextPlanId = currentIndex >= 0 ? (displayPlans[currentIndex + 1]?.id ?? null) : null;
    const upgradeTargetCodes = new Set(upgradeTargets.map((plan) => plan.code));
    function openModuleLegend() {
        setModuleLegendOpen(true);
    }

    function closeModuleLegend() {
        setModuleLegendOpen(false);
    }

    const rows: MatrixRow[] = [
        {
            key: 'price',
            label: t('compare.activationPrice'),
            render: (plan) => (
                <PlanPriceLabel plan={plan} kind="activation" locale={locale} fallback={t('compare.noPrice')} className="font-semibold text-ink" />
            ),
        },
        {
            key: 'monthlyPrice',
            label: t('compare.monthlyPrice'),
            render: (plan) => (
                <PlanPriceLabel
                    plan={plan}
                    kind="recurring"
                    locale={locale}
                    fallback={t('compare.noMonthlyPrice')}
                    suffix={t('compare.perMonthSuffix')}
                    className="font-semibold text-ink"
                />
            ),
        },
        {
            key: 'billing',
            label: t('compare.billing'),
            render: (plan) => <span>{plan.billingPeriod ? t(`billingPeriod.${plan.billingPeriod}`) : PLAN_COMPARISON_EMPTY}</span>,
        },
        {
            key: 'includedMonths',
            label: t('compare.includedMonths'),
            render: (plan) => (
                <span>{plan.includedMonths === null ? PLAN_COMPARISON_EMPTY : t('compare.monthCount', { count: plan.includedMonths })}</span>
            ),
        },
        {
            key: 'storage',
            label: t('compare.storage'),
            render: (plan) => <span>{formatLimitValue(plan.storageBytes, 'bytes') ?? t('compare.unlimited')}</span>,
        },
        {
            key: 'members',
            label: t('compare.members'),
            render: (plan) => <span>{formatLimitValue(plan.maxMembers, 'count') ?? t('compare.unlimited')}</span>,
        },
        {
            key: 'media',
            label: t('compare.mediaCapacity'),
            render: (plan) => {
                const estimate = mediaEstimate(plan.storageBytes);
                return (
                    <span>
                        {estimate ? t('compare.mediaEstimate', { images: estimate.images, videos: estimate.videos }) : t('compare.unlimitedMedia')}
                    </span>
                );
            },
        },
        {
            key: 'modules',
            label: t('compare.modules'),
            action: <PlanModuleGuideButton onOpenAction={openModuleLegend} />,
            render: (plan) => <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />,
        },
    ];

    if (currentPlan && onUpgradeAction && upgradeTargets.length > 0) {
        rows.push({
            key: 'upgrade',
            label: t('compare.upgradeOptions'),
            render: (plan) =>
                upgradeTargetCodes.has(plan.code) ? (
                    <PlanUpgradeButton
                        currentPlan={currentPlan}
                        isCheckoutPending={isCheckoutPending}
                        isPending={isCheckoutPending && pendingPlanCode === plan.code}
                        onUpgrade={onUpgradeAction}
                        retryIn={retryIn}
                        target={plan}
                    />
                ) : (
                    PLAN_COMPARISON_EMPTY
                ),
        });
    }

    return (
        <section>
            <div className="space-y-3 md:hidden">
                <div className="flex items-center justify-between gap-3 px-1 text-xs font-semibold text-ink-muted">
                    <span>{t('compare.modules')}</span>
                    <PlanModuleGuideButton onOpenAction={openModuleLegend} />
                </div>

                <PlanTierCards
                    plans={displayPlans}
                    modules={modules}
                    currentPlanCode={currentPlanCode}
                    currentPlan={currentPlan}
                    isCheckoutPending={isCheckoutPending}
                    nextPlanId={nextPlanId}
                    onUpgradeAction={onUpgradeAction}
                    pendingPlanCode={pendingPlanCode}
                    retryIn={retryIn}
                    upgradeTargets={upgradeTargets}
                />
                <p className="text-xs leading-5 text-ink-faint">{t('compare.mediaAssumption')}</p>
            </div>

            <div className="hidden md:block">
                <PlanComparisonMatrix
                    plans={displayPlans}
                    rows={rows}
                    currentPlanCode={currentPlanCode}
                    nextPlanId={nextPlanId}
                    fieldLabel={t('compare.field')}
                />
                <p className="mt-3 text-xs leading-5 text-ink-faint">{t('compare.mediaAssumption')}</p>
            </div>

            <PlanModuleGuideModal open={moduleLegendOpen} onCloseAction={closeModuleLegend} modules={modules} paidServices={paidServices} />
        </section>
    );
}
