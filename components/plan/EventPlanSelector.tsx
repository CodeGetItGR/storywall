'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatLimitValue } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

type EventPlanSelectorProps = {
    plans: PlanTierResponseDto[];
    selectedCode: string;
    onSelect: (code: string) => void;
    onContinue: () => void;
};

export function EventPlanSelector({ plans, selectedCode, onSelect, onContinue }: EventPlanSelectorProps) {
    const t = useTranslations('CreateEventPage');

    function handlePlanClick(event: MouseEvent<HTMLButtonElement>) {
        const code = event.currentTarget.dataset.planCode;
        if (code) onSelect(code);
    }

    function renderLimit(value: number | null, unit: 'bytes' | 'count'): string {
        return formatLimitValue(value, unit) ?? t('unlimited');
    }

    return (
        <div className="space-y-3">
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
                            <p className="font-semibold text-ink">{plan.name}</p>
                            <p className="mt-1 text-sm text-ink-muted">{plan.description ?? t('planDescriptionFallback')}</p>
                        </div>
                        {selectedCode === plan.code && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                                <Check className="h-4 w-4" />
                            </span>
                        )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-muted">
                        <span className="rounded-full bg-surface-muted px-2.5 py-1">
                            {renderLimit(plan.storageBytes, 'bytes')} {t('planLimits.storage')}
                        </span>
                        <span className="rounded-full bg-surface-muted px-2.5 py-1">
                            {renderLimit(plan.maxMembers, 'count')} {t('planLimits.members')}
                        </span>
                        {plan.moduleKeys.slice(0, 4).map((moduleKey) => (
                            <span key={moduleKey} className="rounded-full bg-surface-muted px-2.5 py-1">
                                {moduleKey}
                            </span>
                        ))}
                    </div>
                </button>
            ))}
            <button
                type="button"
                disabled={!selectedCode}
                onClick={onContinue}
                className="mt-2 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {t('continueToPayment')}
            </button>
        </div>
    );
}
