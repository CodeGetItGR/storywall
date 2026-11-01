'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { PlanModuleConfigField } from '@/components/admin/plans/PlanModuleConfigField';
import type { ValueChoice } from '@/lib/adminEvents';
import type { PartnerRole } from '@/lib/api/types';
import type { KnownConfigField } from '@/lib/planModuleConfig';

const VALUE_CHOICES: readonly ValueChoice[] = ['PLAN', 'SET'];

function noop() {}

// A value setting: the plan's, or one set exactly for this event with the same control the plan grid uses.
export function EventModuleConfigValueFields({
    field,
    choice,
    draft,
    planText,
    error,
    onChoiceChangeAction,
    onDraftChangeAction,
    onTypeChangeAction,
}: {
    field: KnownConfigField;
    choice: ValueChoice;
    draft: string;
    planText: string;
    error?: string;
    onChoiceChangeAction: (choice: ValueChoice) => void;
    onDraftChangeAction: (key: string, value: string) => void;
    onTypeChangeAction: (key: string, role: PartnerRole, checked: boolean) => void;
}) {
    const t = useTranslations('AdminPage.events.moduleConfig');

    function handleChoiceChange(event: ChangeEvent<HTMLInputElement>) {
        onChoiceChangeAction(event.currentTarget.value === 'SET' ? 'SET' : 'PLAN');
    }

    return (
        <div className="space-y-4">
            {/* Plan's value or this event's */}
            <fieldset>
                <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('value')}</legend>
                <div className="space-y-1.5">
                    {VALUE_CHOICES.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-ink">
                            <input type="radio" name="module-config-value" value={option} checked={choice === option} onChange={handleChoiceChange} />
                            {option === 'PLAN' ? t('followPlan', { value: planText }) : t('setForEvent')}
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* This event's value */}
            {choice === 'SET' && (
                <PlanModuleConfigField
                    field={field}
                    value={draft}
                    limited
                    error={error}
                    onLimitModeChangeAction={noop}
                    onLimitValueChangeAction={onDraftChangeAction}
                    onSwitchChangeAction={noop}
                    onTypeChangeAction={onTypeChangeAction}
                />
            )}
            <p className="text-xs text-ink-muted">{t('valueHint')}</p>
        </div>
    );
}
