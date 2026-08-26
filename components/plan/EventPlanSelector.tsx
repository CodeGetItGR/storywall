'use client';

import { Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useState } from 'react';

import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanMoreInfoSheet } from '@/components/plan/PlanMoreInfoSheet';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    selectedCode: string;
    onSelectAction: (code: string) => void;
    isLoading?: boolean;
};

export function EventPlanSelector({ plans, modules, selectedCode, onSelectAction, isLoading = false }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const localizedPlanDescription = useLocalizedPlanDescription();
    const [moreInfoPlan, setMoreInfoPlan] = useState<PlanTierResponseDto | null>(null);

    function handlePlanClick(event: MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.planCode;
        if (code) onSelectAction(code);
    }

    function openMoreInfo(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        const code = event.currentTarget.dataset.planCode;
        const plan = plans.find((planItem) => planItem.code === code);
        if (plan) setMoreInfoPlan(plan);
    }

    function closeMoreInfo() {
        setMoreInfoPlan(null);
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
                                    'w-full rounded-xl border p-5 text-left transition hover:border-primary/40 hover:bg-primary-light/30',
                                    selectedCode === plan.code ? 'border-primary bg-primary-light/50' : 'border-border bg-white'
                                )}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-xl font-bold text-ink">{plan.name}</p>
                                        <PlanPriceLabel
                                            plan={plan}
                                            kind="activation"
                                            locale={locale}
                                            fallback={t('payment.noCharge')}
                                            className="mt-1 block text-2xl font-bold text-primary-dark"
                                        />
                                    </div>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-ink-muted">{localizedPlanDescription(plan)}</p>
                                <div className="mt-4 space-y-2.5">
                                    <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('planLimits.members')}</p>
                                        <p className="mt-1 text-base font-bold text-ink">{renderLimit(plan.maxMembers, 'count')}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-muted/70 px-3 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('planLimits.storage')}</p>
                                        <p className="mt-1 text-base font-bold text-ink">{renderLimit(plan.storageBytes, 'bytes')}</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('planLimits.modules')}</p>
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
                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    data-plan-code={plan.code}
                                    onClick={openMoreInfo}
                                    className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                                >
                                    {t('moreInfo')}
                                </button>
                            </div>
                        </div>
                    ))}
                <PlanMoreInfoSheet open={moreInfoPlan !== null} onCloseAction={closeMoreInfo} plan={moreInfoPlan} modules={modules} />
            </div>
        </div>
    );
}
