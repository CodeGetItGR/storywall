'use client';

import { CopyPlus, Pencil } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { PlanSharedGroupChip } from '@/components/admin/plans/PlanSharedGroupChip';
import { type Visibility, visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto, PlatformEventTypeResponseDto } from '@/lib/api/types';
import { formatLimitValue, formatPlanMoney } from '@/lib/planTiers';
import { cn } from '@/lib/utils';

const STATUS_DOT: Record<Visibility, string> = { LIVE: 'bg-status-good', HIDDEN: 'bg-status-warn', ARCHIVED: 'bg-status-neutral' };
const STATUS_PILL: Record<Visibility, string> = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
};

const ICON_BUTTON = 'inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink';

export function PlanRow({
    plan,
    allPlans,
    eventTypes,
    onEditClickAction,
    onDuplicateClickAction,
    onSelectEventTypeAction,
}: {
    plan: PlanTierResponseDto;
    allPlans: PlanTierResponseDto[];
    eventTypes: PlatformEventTypeResponseDto[];
    onEditClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onDuplicateClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
    onSelectEventTypeAction: (key: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    const status = visibilityOf(plan);

    return (
        <tr className="border-b border-border last:border-b-0 hover:bg-canvas/60">
            <td className="max-w-64 px-3 py-2">
                <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-ink">{plan.name}</p>
                    {plan.isDefault && (
                        <span className="shrink-0 rounded-full bg-primary-light px-1.5 py-0.5 text-[9.5px] font-bold text-primary-dark">{t('plans.default')}</span>
                    )}
                </div>
                <p className="truncate font-mono text-[11px] text-ink-faint">{plan.code}</p>
            </td>
            <td className="px-2.5 py-2 font-mono text-ink">{formatPlanMoney(plan, locale) ?? t('plans.noPrice')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">{formatLimitValue(plan.storageBytes, 'bytes') ?? t('unlimited')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">{formatLimitValue(plan.maxMembers, 'count') ?? t('unlimited')}</td>
            <td className="px-2.5 py-2 font-mono text-ink-muted">
                {plan.autoDeleteMonths === null ? t('plans.columns.never') : t('plans.columns.months', { count: plan.autoDeleteMonths })}
            </td>
            <td className="px-2.5 py-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_PILL[status])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                    {t(`plans.status.${status}`)}
                </span>
            </td>
            <td className="px-2.5 py-2">
                <PlanSharedGroupChip plan={plan} allPlans={allPlans} eventTypes={eventTypes} onSelectEventTypeAction={onSelectEventTypeAction} />
            </td>
            <td className="px-2.5 py-2 text-right">
                <div className="flex items-center justify-end gap-0.5">
                    <button
                        type="button"
                        data-plan-id={plan.id}
                        onClick={onDuplicateClickAction}
                        aria-label={t('plans.duplicate.action', { plan: plan.name })}
                        title={t('plans.duplicate.label')}
                        className={ICON_BUTTON}
                    >
                        <CopyPlus className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" data-plan-id={plan.id} onClick={onEditClickAction} aria-label={t('plans.edit')} className={ICON_BUTTON}>
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
