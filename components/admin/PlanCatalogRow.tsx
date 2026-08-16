'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { PlanModuleIcons } from '@/components/plan/PlanModuleIcons';
import type { PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';

function ReadOnlyValue({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
            <dd className="mt-0.5 truncate text-sm text-ink-muted">{children}</dd>
        </div>
    );
}

export function PlanCatalogRow({
    plan,
    modules,
    onEdit,
}: {
    plan: PlanTierResponseDto;
    modules: PlatformModuleResponseDto[];
    onEdit: (planId: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const tCommon = useTranslations('Common');
    const handleEdit = useCallback(() => {
        onEdit(plan.id);
    }, [onEdit, plan.id]);

    return (
        <article className="border-b border-border py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">{plan.code}</span>
                        {plan.isDefault && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary-dark">
                                {t('plans.default')}
                            </span>
                        )}
                        {!plan.isAssignable && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{t('plans.archived')}</span>
                        )}
                    </div>
                    {plan.description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink-muted">{plan.description}</p>}
                </div>
                <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('plans.edit')}
                </button>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-7">
                <ReadOnlyValue label={t('fields.price')}>{formatPlanMoney(plan) ?? t('plans.noPrice')}</ReadOnlyValue>
                {plan.scope === 'EVENT' ? (
                    <>
                        <ReadOnlyValue label={t('fields.maxMembers')}>{formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')}</ReadOnlyValue>
                        <ReadOnlyValue label={t('fields.storage')}>{formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')}</ReadOnlyValue>
                        <div className="min-w-0 sm:col-span-2">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t('plans.includedModules')}</dt>
                            <dd className="mt-1 text-sm text-ink-muted">
                                <PlanModuleIcons moduleKeys={plan.moduleKeys} modules={modules} showDisabled />
                            </dd>
                        </div>
                    </>
                ) : (
                    <ReadOnlyValue label={t('fields.maxEventsPerUser')}>
                        {formatLimitValue(plan.maxActiveEvents, 'count') ?? t('unlimited')}
                    </ReadOnlyValue>
                )}
                <ReadOnlyValue label={t('fields.isAssignable')}>{plan.isAssignable ? tCommon('yes') : tCommon('no')}</ReadOnlyValue>
                <ReadOnlyValue label={t('fields.isPublic')}>{plan.isPublic ? tCommon('yes') : tCommon('no')}</ReadOnlyValue>
            </dl>
        </article>
    );
}
