'use client';

import { useTranslations } from 'next-intl';

import type { LabeledExtensionPlanGroup } from '@/hooks/useExtensionPlanGroups';
import { visibilityOf } from '@/lib/adminVisibility';
import type { PlanTierResponseDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STATUS_PILL = {
    LIVE: 'bg-status-good-wash text-status-good',
    HIDDEN: 'bg-status-warn-wash text-status-warn',
} as const;

// The plans a new extension goes on, under their event type, so plans that
// share a name stay apart by type, code and status. A plan that already sells
// the typed length is shown but can't be ticked.
export function ExtensionPlanPicker({
    groups,
    picked,
    sellingLength,
    onToggleAction,
}: {
    groups: LabeledExtensionPlanGroup[];
    picked: string[];
    sellingLength: Set<string>;
    onToggleAction: (planTierId: string) => void;
}) {
    const t = useTranslations('AdminPage');

    return (
        <fieldset>
            <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {t('paidServices.columns.plans')}
                <span aria-hidden="true" className="ml-1 align-top text-[1.5em] font-medium text-ink-muted/80">
                    *
                </span>
            </legend>
            {groups.length === 0 ? (
                <p className="text-xs text-ink-faint">{t('paidServices.fields.noEventPlans')}</p>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => (
                        <div key={group.eventTypeKey}>
                            {/* Event type */}
                            {group.label && <p className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-faint uppercase">{group.label}</p>}

                            {/* Plans */}
                            <div className="overflow-hidden rounded-md border border-border">
                                {group.plans.map((plan) => (
                                    <PlanOption
                                        key={plan.id}
                                        plan={plan}
                                        checked={picked.includes(plan.id)}
                                        selling={sellingLength.has(plan.id)}
                                        onToggleAction={onToggleAction}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </fieldset>
    );
}

function PlanOption({
    plan,
    checked,
    selling,
    onToggleAction,
}: {
    plan: PlanTierResponseDto;
    checked: boolean;
    selling: boolean;
    onToggleAction: (planTierId: string) => void;
}) {
    const t = useTranslations('AdminPage');
    const status = visibilityOf(plan) === 'HIDDEN' ? 'HIDDEN' : 'LIVE';

    function handleChange() {
        onToggleAction(plan.id);
    }

    return (
        <label
            className={cn(
                'flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0',
                selling ? 'cursor-not-allowed bg-canvas/60' : 'cursor-pointer hover:bg-canvas/60',
            )}
        >
            <input
                type="checkbox"
                checked={checked && !selling}
                disabled={selling}
                onChange={handleChange}
                className="h-4 w-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1">
                <span className={cn('block truncate font-semibold', selling ? 'text-ink-faint' : 'text-ink')}>{plan.name}</span>
                {selling && <span className="block text-[11px] text-ink-faint">{t('paidServices.extensions.alreadySells')}</span>}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-ink-faint">{plan.code}</span>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_PILL[status])}>{t(`plans.status.${status}`)}</span>
        </label>
    );
}
