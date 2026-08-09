'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { PlanComparisonMatrix, type MatrixRow } from '@/components/plan/PlanComparisonMatrix';
import { PlanComparisonMobile, type ComparisonRow } from '@/components/plan/PlanComparisonMobile';
import { PlanModuleGuideModal } from '@/components/plan/PlanModuleGuideModal';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanModuleGuideButton } from '@/components/plan/PlanModuleGuideButton';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { PLAN_COMPARISON_EMPTY, formatPlanDiscount, mediaEstimate } from '@/lib/planComparison';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';

export function EventPlanComparison({
    plans,
    modules,
    currentPlanCode,
}: {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlanCode?: string | null;
}) {
    const t = useTranslations('EventPlanSettingsPage');
    const [moduleLegendOpen, setModuleLegendOpen] = useState(false);

    const displayPlans = useMemo(() => [...plans].sort((left, right) => left.sortOrder - right.sortOrder), [plans]);
    const currentIndex = currentPlanCode ? displayPlans.findIndex((plan) => plan.code === currentPlanCode) : -1;
    const nextPlanId = currentIndex >= 0 ? displayPlans[currentIndex + 1]?.id ?? null : null;
    const allModuleKeys = useMemo(() => Array.from(new Set(displayPlans.flatMap((plan) => plan.moduleKeys))), [displayPlans]);

    function openModuleLegend() {
        setModuleLegendOpen(true);
    }

    function closeModuleLegend() {
        setModuleLegendOpen(false);
    }

    const rows: ComparisonRow[] = [
        {
            key: 'price',
            label: t('compare.price'),
            render: (plan) => <span className="font-semibold text-ink">{formatPlanMoney(plan) ?? t('compare.noPrice')}</span>,
        },
        {
            key: 'billing',
            label: t('compare.billing'),
            render: (plan) => <span>{plan.billingPeriod ? t(`billingPeriod.${plan.billingPeriod}`) : PLAN_COMPARISON_EMPTY}</span>,
        },
        {
            key: 'includedMonths',
            label: t('compare.includedMonths'),
            render: (plan) => <span>{plan.includedMonths === null ? PLAN_COMPARISON_EMPTY : t('compare.monthCount', { count: plan.includedMonths })}</span>,
        },
        {
            key: 'discount',
            label: t('compare.discount'),
            render: (plan) => <span>{formatPlanDiscount(plan)}</span>,
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
                return <span>{estimate ? t('compare.mediaEstimate', { images: estimate.images, videos: estimate.videos }) : t('compare.unlimitedMedia')}</span>;
            },
        },
        {
            key: 'modules',
            label: t('compare.modules'),
            action: <PlanModuleGuideButton onOpen={openModuleLegend} />,
            render: (plan) => <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />,
        },
    ];

    const matrixRows: MatrixRow[] = rows.map((row) => ({
        key: row.key,
        label: row.label,
        action: row.action,
        render: row.render,
    }));

    return (
        <section>
            <div className="md:hidden">
                <PlanComparisonMobile
                    plans={displayPlans}
                    rows={rows}
                    currentPlanCode={currentPlanCode}
                    nextPlanId={nextPlanId}
                />
            </div>

            <div className="hidden md:block">
                <PlanComparisonMatrix plans={displayPlans} rows={matrixRows} currentPlanCode={currentPlanCode} nextPlanId={nextPlanId} />
            </div>

            <p className="mt-3 text-xs leading-5 text-ink-faint">{t('compare.mediaAssumption')}</p>

            <PlanModuleGuideModal open={moduleLegendOpen} onClose={closeModuleLegend} moduleKeys={allModuleKeys} modules={modules} />
        </section>
    );
}
