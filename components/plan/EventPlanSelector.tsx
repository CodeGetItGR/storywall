'use client';

import { Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useMemo, useState } from 'react';

import { PlanModuleGuideButton } from '@/components/plan/PlanModuleGuideButton';
import { PlanModuleGuideModal } from '@/components/plan/PlanModuleGuideModal';
import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import { PlanPriceLabel } from '@/components/plan/PlanPriceLabel';
import { useLocalizedPlanDescription } from '@/hooks/useLocalizedPlanDescription';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { enabledModuleKeys } from '@/lib/planModules';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    selectedCode: string;
    onSelect: (code: string) => void;
    onContinue: () => void;
};

export function EventPlanSelector({ plans, modules, selectedCode, onSelect, onContinue }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');
    const locale = useLocale();
    const localizedPlanDescription = useLocalizedPlanDescription();
    const [isModuleGuideOpen, setIsModuleGuideOpen] = useState(false);
    const moduleGuideKeys = useMemo(
        () => enabledModuleKeys(Array.from(new Set(plans.flatMap((plan) => plan.moduleKeys))), modules),
        [modules, plans]
    );

    function handlePlanClick(event: MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.planCode;
        if (code) onSelect(code);
    }

    function renderLimit(value: number | null, unit: 'bytes' | 'count'): string {
        return formatLimitValue(value, unit) ?? t('unlimited');
    }

    function openModuleGuide() {
        setIsModuleGuideOpen(true);
    }

    function closeModuleGuide() {
        setIsModuleGuideOpen(false);
    }

    return (
        <div className="space-y-3">
            {moduleGuideKeys.length > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold text-ink-muted">
                    <span>{t('planLimits.modules')}</span>
                    <PlanModuleGuideButton onOpen={openModuleGuide} />
                </div>
            )}
            {plans.length === 0 && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600">{t('noPlans')}</p>}
            {plans.map((plan) => (
                <button
                    key={plan.id}
                    type="button"
                    data-plan-code={plan.code}
                    onClick={handlePlanClick}
                    className={cn(
                        'w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-primary-light/30',
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
                        {selectedCode === plan.code && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                                <Check className="h-4 w-4" />
                            </span>
                        )}
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
                </button>
            ))}
            <PlanModuleGuideModal open={isModuleGuideOpen} onClose={closeModuleGuide} moduleKeys={moduleGuideKeys} modules={modules} />
            <button
                type="button"
                disabled={!selectedCode}
                onClick={onContinue}
                className="mt-2 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {t('continueToDetails')}
            </button>
        </div>
    );
}
