'use client';

import { useTranslations } from 'next-intl';

import type { PlanTierResponseDto } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';

export function PlanEditorHeader({
    plan,
    isEvent,
    isMakingDefault,
    onMakeDefaultAction,
}: {
    plan: PlanTierResponseDto;
    isEvent: boolean;
    isMakingDefault: boolean;
    onMakeDefaultAction: () => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <header className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
            {/* Header */}
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-2xl font-bold tracking-tight text-ink">{plan.name}</h3>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{plan.code}</span>
                    {plan.isDefault && (
                        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                            {t('plans.default')}
                        </span>
                    )}
                    {!plan.isAssignable && (
                        <span className="rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-semibold text-status-warn">
                            {t('plans.archived')}
                        </span>
                    )}
                </div>

                {/* Summary */}
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold text-ink-muted">
                    <span className="rounded-full bg-surface-muted px-2 py-1">{formatPlanMoney(plan) ?? t('plans.noPrice')}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-1">
                        {isEvent
                            ? `${formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')} ${t('plans.members')}`
                            : `${formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')} ${t('plans.eventsPerUser')}`}
                    </span>
                    {isEvent && (
                        <span className="rounded-full bg-surface-muted px-2 py-1">
                            {formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')} {t('plans.storage')}
                        </span>
                    )}
                </div>
            </div>

            {/* Primary action */}
            {!plan.isDefault && (
                <button
                    type="button"
                    onClick={onMakeDefaultAction}
                    disabled={isMakingDefault}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary-light px-4 text-sm font-bold text-primary-dark transition hover:border-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
                >
                    {t('plans.makeDefault')}
                </button>
            )}
        </header>
    );
}
