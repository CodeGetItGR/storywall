'use client';

import { Loader2, Sparkles } from 'lucide-react';
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
    const [moreInfoOpen, setMoreInfoOpen] = useState(false);
    const [moreInfoPlan, setMoreInfoPlan] = useState<PlanTierResponseDto | null>(null);

    function handlePlanClick(event: MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.planCode;
        if (code) onSelectAction(code);
    }

    function openMoreInfo(event: MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        const code = event.currentTarget.dataset.planCode;
        const plan = plans.find((planItem) => planItem.code === code);
        if (plan) {
            setMoreInfoPlan(plan);
            setMoreInfoOpen(true);
        }
    }

    function closeMoreInfo() {
        setMoreInfoOpen(false);
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
            detail[service.grantsModuleKey] = t('paidModules.oncePrice', { price });
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
                        <div key={plan.id}>
                            <div
                                className={cn(
                                    'relative overflow-hidden rounded-xl border transition',
                                    selectedCode === plan.code
                                        ? 'border-primary bg-primary-light/50'
                                        : 'border-border bg-white hover:border-primary/40 hover:bg-primary-light/30'
                                )}
                            >
                                {/* Accent */}
                                <div className="h-1.5 w-full bg-gradient-logo" />
                                <button type="button" data-plan-code={plan.code} onClick={handlePlanClick} className="w-full p-4 text-left">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex items-start justify-between w-full">
                                            <p className="truncate text-3xl font-bold text-ink">{plan.name}</p>
                                            <PlanPriceLabel
                                                plan={plan}
                                                locale={locale}
                                                fallback={t('payment.noCharge')}
                                                className="block text-2xl font-bold text-primary-dark"
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-ink-muted">{localizedPlanDescription(plan)}</p>
                                    {/* Capabilities */}
                                    <div className="mt-4 flex items-baseline gap-8">
                                        <div>
                                            <p className="text-2xl font-bold text-ink">{renderLimit(plan.maxMembers, 'count')}</p>
                                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                                                {t('planLimits.members')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-ink">{renderLimit(plan.storageBytes, 'bytes')}</p>
                                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                                                {t('planLimits.storage')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                                            {t('planLimits.modules')}
                                        </p>
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
                                    <div className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                                        <Sparkles className="h-5.5 w-5.5 text-primary-dark" />
                                        {t('originalsHighlight')}
                                    </div>
                                </button>
                                {/* More info */}
                                <button
                                    type="button"
                                    data-plan-code={plan.code}
                                    onClick={openMoreInfo}
                                    className="group flex w-full flex-col items-center gap-1 border-t border-border/70 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                                >
                                    {t('moreInfo')}
                                </button>
                            </div>
                        </div>
                    ))}
                <PlanMoreInfoSheet open={moreInfoOpen} onCloseAction={closeMoreInfo} plan={moreInfoPlan} modules={modules} />
            </div>
        </div>
    );
}
