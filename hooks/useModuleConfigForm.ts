'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useResetEventModuleConfig, useSetEventModuleConfig } from '@/hooks/useAdminEvents';
import {
    capWithExtra,
    type FlagChoice,
    flagChoice,
    isGrantReasonValid,
    moduleConfigChange,
    parseConfigExtra,
    type ValueChoice,
    valueChoice as initialValueChoice,
} from '@/lib/adminEvents';
import type { AdminEventModuleConfig, PartnerRole } from '@/lib/api/types';
import { fieldDraftFromValue, fieldValueFromDraft, isValidNumberDraft, knownConfigFields, toggleTypeDraft } from '@/lib/planModuleConfig';

const FLAG_CHOICES: readonly FlagChoice[] = ['PLAN', 'ON', 'OFF'];

function isFlagChoice(value: string): value is FlagChoice {
    return (FLAG_CHOICES as readonly string[]).includes(value);
}

// One module setting: a cap takes an extra on top of the plan's, a flag follows the plan or is set
// on or off, a value follows the plan or is set exactly for the event. Back to the plan's value is a
// reset; nothing changed means nothing to save.
export function useModuleConfigForm(eventId: string, config: AdminEventModuleConfig, onDoneAction: () => void) {
    const field = knownConfigFields(config.moduleKey).find((item) => item.key === config.configKey) ?? null;
    const [extra, setExtra] = useState(() => String(config.override?.extra ?? 0));
    const [choice, setChoice] = useState<FlagChoice>(() => flagChoice(config));
    const [valueChoice, setValueChoice] = useState<ValueChoice>(() => initialValueChoice(config));
    // A value starts from the event's own, else the plan's, so a small change is a small edit.
    const [valueDraft, setValueDraft] = useState(() => (field ? fieldDraftFromValue(field, config.override?.value ?? config.planValue) : ''));
    const [reason, setReason] = useState('');
    const setMutation = useSetEventModuleConfig(eventId);
    const resetMutation = useResetEventModuleConfig(eventId);

    const parsedExtra = parseConfigExtra(extra);
    const valueValid = field !== null && (field.type !== 'number' || isValidNumberDraft(field, valueDraft));
    const value = valueValid && field ? fieldValueFromDraft(field, valueDraft, config.override?.value) : undefined;
    const change =
        config.kind === 'COUNT'
            ? parsedExtra === null
                ? null
                : moduleConfigChange(config, { extra: parsedExtra })
            : config.kind === 'FLAG'
              ? moduleConfigChange(config, { choice })
              : moduleConfigChange(config, { valueChoice, value });
    const reasonValid = isGrantReasonValid(reason);
    const isSaving = setMutation.isPending || resetMutation.isPending;
    const canSave = change !== null && reasonValid && !isSaving;

    function handleExtraChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        setExtra(changeEvent.currentTarget.value);
    }

    function handleChoiceChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        const { value: next } = changeEvent.currentTarget;
        if (isFlagChoice(next)) setChoice(next);
    }

    function handleValueChoiceChange(next: ValueChoice) {
        setValueChoice(next);
    }

    function handleValueDraftChange(_key: string, next: string) {
        setValueDraft(next);
    }

    function handleTypeChange(_key: string, role: PartnerRole, checked: boolean) {
        setValueDraft((current) => toggleTypeDraft(current, role, checked));
    }

    function handleReasonChange(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setReason(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave || change === null) return;
        const target = { moduleKey: config.moduleKey, configKey: config.configKey, reason: reason.trim() };
        if (change.kind === 'reset') resetMutation.mutate(target, { onSuccess: onDoneAction });
        else
            setMutation.mutate(
                { ...target, extra: change.extra, enabled: change.enabled, ...(config.kind === 'VALUE' ? { value: change.value } : {}) },
                { onSuccess: onDoneAction },
            );
    }

    return {
        extra,
        handleExtraChange,
        choice,
        handleChoiceChange,
        field,
        valueChoice,
        handleValueChoiceChange,
        valueDraft,
        handleValueDraftChange,
        handleTypeChange,
        // The value saving would leave, for the preview; undefined while the draft isn't valid.
        nextValue: valueChoice === 'PLAN' ? config.planValue : value,
        valueInvalid: valueChoice === 'SET' && !valueValid,
        reason,
        handleReasonChange,
        extraInvalid: extra.trim() !== '' && parsedExtra === null,
        reasonInvalid: reason.length > 0 && !reasonValid,
        resultCap: parsedExtra === null ? null : capWithExtra(config.planValue, parsedExtra),
        parsedExtra,
        change,
        canSave,
        handleSubmit,
        isSaving,
        error: setMutation.error ?? resetMutation.error,
    };
}
