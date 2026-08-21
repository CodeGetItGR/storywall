'use client';

import { Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useState } from 'react';

import { PlanModuleGuideButton } from '@/components/plan/PlanModuleGuideButton';
import { PlanModuleGuideModal } from '@/components/plan/PlanModuleGuideModal';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { publicEnabledModules } from '@/lib/planModules';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    selectedCode: string;
    onSelect: (code: string) => void;
    isLoading?: boolean;
};

export function EventPlanSelector({ plans, modules, selectedCode, onSelect, isLoading = false }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const localizedPlanDescription = useLocalizedPlanDescription();
    const [guidePlan, setGuidePlan] = useState<PlanTierResponseDto | null>(null);
    const hasModuleGuide = publicEnabledModules(modules).length > 0;

    function handlePlanClick(event: MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.planCode;
        if (code) onSelect(code);
    }

    function openModuleGuide(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        const code = event.currentTarget.dataset.planCode;
        const plan = plans.find((planItem) => planItem.code === code);
        if (plan) setGuidePlan(plan);
    }

    function closeModuleGuide() {
        setGuidePlan(null);
    }

    function renderLimit(value: number | null, unit: 'bytes' | 'count'): string {
        return formatLimitValue(value, unit) ?? t('unlimited');
    }

    function paidAddonModuleKeys(plan: PlanTierResponseDto): string[] {
        return (plan.paidModules ?? []).map((service) => service.grantsModuleKey).filter((key): key is string => Boolean(key));
    }

    function paidAddonDetailByModuleKey(plan: PlanTierResponseDto): Record<string, string> {
        const detail: Record<string, string> = {};
        for (const service of plan.paidModules ?? []) {
            if (!service.grantsModuleKey) continue;
            const price = formatMoney(locale, service.priceAmountMinor, service.priceCurrency);
            detail[service.grantsModuleKey] =
                service.billingPeriod === 'ONE_TIME' ? t('paidModules.oncePrice', { price }) : t('paidModules.monthlyPrice', { price });
        }
        return detail;
    }

    return (
        <div className="flex h-full flex-col">
            {/* Plan Content */}
            <div className="space-y-3">
                {isLoading && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white p-6 text-sm text-ink-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('loadingPlans')}
                    </div>
                )}
                {!isLoading && plans.length === 0 && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noPlans')}</p>}
                {!isLoading &&
                    plans.map((plan) => (
                        <div key={plan.id} className="relative">
                            <button
                                type="button"
                                data-plan-code={plan.code}
                                onClick={handlePlanClick}
                                className={cn(
                                    'w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-primary-light/30',
                                    hasModuleGuide && 'pr-16',
                                    selectedCode === plan.code ? 'border-primary bg-primary-light/50' : 'border-border bg-white'
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <p className="font-semibold text-ink">{plan.name}</p>
                                            <PlanPriceLabel
                                                plan={plan}
                                                kind="activation"
                                                locale={locale}
                                                fallback={t('payment.noCharge')}
                                                className="text-sm font-semibold text-primary-dark"
                                            />
                                        </div>
                                        <p className="mt-1 text-sm text-ink-muted">{localizedPlanDescription(plan)}</p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-muted">
                                    <span className="rounded-full bg-surface-muted px-2.5 py-1 flex items-center justify-center">
                                        {renderLimit(plan.storageBytes, 'bytes')} {t('planLimits.storage')}
                                    </span>
                                    <span className="rounded-full bg-surface-muted px-2.5 py-1 flex items-center justify-center">
                                        {renderLimit(plan.maxMembers, 'count')} {t('planLimits.members')}
                                    </span>
                                    <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} />
                                </div>
                                {(plan.paidModules?.length ?? 0) > 0 && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
                                        <span>{t('planLimits.addonModules')}:</span>
                                        <PlanModuleIcons
                                            moduleKeys={paidAddonModuleKeys(plan)}
                                            modules={modules}
                                            variant="addon"
                                            detailByModuleKey={paidAddonDetailByModuleKey(plan)}
                                        />
                                    </div>
                                )}
                            </button>
                            {hasModuleGuide && (
                                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
                                    <PlanModuleGuideButton planCode={plan.code} onOpen={openModuleGuide} />
                                </div>
                            )}
                        </div>
                    ))}
                <PlanModuleGuideModal
                    open={guidePlan !== null}
                    onClose={closeModuleGuide}
                    modules={modules}
                    paidServices={guidePlan?.paidModules ?? []}
                    planName={guidePlan?.name}
                />
            </div>
        </div>
    );
}
