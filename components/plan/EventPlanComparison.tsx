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
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { mediaEstimate, PLAN_COMPARISON_EMPTY } from '@/lib/planComparison';
import { enabledModuleKeys } from '@/lib/planModules';
import { formatLimitValue } from '@/lib/planTiers';

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
    const locale = useLocale();
    const [moduleLegendOpen, setModuleLegendOpen] = useState(false);

    const displayPlans = useMemo(() => [...plans].sort((left, right) => left.sortOrder - right.sortOrder), [plans]);
    const currentIndex = currentPlanCode ? displayPlans.findIndex((plan) => plan.code === currentPlanCode) : -1;
    const nextPlanId = currentIndex >= 0 ? (displayPlans[currentIndex + 1]?.id ?? null) : null;
    const allModuleKeys = useMemo(
        () => enabledModuleKeys(Array.from(new Set(displayPlans.flatMap((plan) => plan.moduleKeys))), modules),
        [displayPlans, modules]
    );

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
            render: (plan) => <PlanPriceLabel plan={plan} kind="activation" locale={locale} fallback={t('compare.noPrice')} className="font-semibold text-ink" />,
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
            action: <PlanModuleGuideButton onOpen={openModuleLegend} />,
            render: (plan) => <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />,
        },
    ];

    return (
        <section>
            <div className="space-y-3 md:hidden">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold text-ink-muted">
                    <span>{t('compare.modules')}</span>
                    <PlanModuleGuideButton onOpen={openModuleLegend} />
                </div>

                <PlanTierCards plans={displayPlans} modules={modules} currentPlanCode={currentPlanCode} nextPlanId={nextPlanId} />
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

            <PlanModuleGuideModal open={moduleLegendOpen} onClose={closeModuleLegend} moduleKeys={allModuleKeys} modules={modules} />
        </section>
    );
}
