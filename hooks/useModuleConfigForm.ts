'use client';

import { type ChangeEvent, type FormEvent, useState } from 'react';

import { useResetEventModuleConfig, useSetEventModuleConfig } from '@/hooks/useAdminEvents';
import { capWithExtra, type FlagChoice, flagChoice, isGrantReasonValid, moduleConfigChange, parseConfigExtra } from '@/lib/adminEvents';
import type { AdminEventModuleConfig } from '@/lib/api/types';

const FLAG_CHOICES: readonly FlagChoice[] = ['PLAN', 'ON', 'OFF'];

function isFlagChoice(value: string): value is FlagChoice {
    return (FLAG_CHOICES as readonly string[]).includes(value);
}

// One module setting: a cap takes an extra on top of the plan's, a flag follows the plan or is set
// on or off. Back to the plan's value is a reset; nothing changed means nothing to save.
export function useModuleConfigForm(eventId: string, config: AdminEventModuleConfig, onDoneAction: () => void) {
    const [extra, setExtra] = useState(() => String(config.override?.extra ?? 0));
    const [choice, setChoice] = useState<FlagChoice>(() => flagChoice(config));
    const [reason, setReason] = useState('');
    const setMutation = useSetEventModuleConfig(eventId);
    const resetMutation = useResetEventModuleConfig(eventId);

    const isCount = config.kind === 'COUNT';
    const parsedExtra = parseConfigExtra(extra);
    const change = isCount ? (parsedExtra === null ? null : moduleConfigChange(config, { extra: parsedExtra })) : moduleConfigChange(config, { choice });
    const reasonValid = isGrantReasonValid(reason);
    const isSaving = setMutation.isPending || resetMutation.isPending;
    const canSave = change !== null && reasonValid && !isSaving;

    function handleExtraChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        setExtra(changeEvent.currentTarget.value);
    }

    function handleChoiceChange(changeEvent: ChangeEvent<HTMLInputElement>) {
        const { value } = changeEvent.currentTarget;
        if (isFlagChoice(value)) setChoice(value);
    }

    function handleReasonChange(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setReason(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave || change === null) return;
        const target = { moduleKey: config.moduleKey, configKey: config.configKey, reason: reason.trim() };
        if (change.kind === 'reset') resetMutation.mutate(target, { onSuccess: onDoneAction });
        else setMutation.mutate({ ...target, extra: change.extra, enabled: change.enabled }, { onSuccess: onDoneAction });
    }

    return {
        extra,
        handleExtraChange,
        choice,
        handleChoiceChange,
        reason,
        handleReasonChange,
        extraInvalid: extra.trim() !== '' && parsedExtra === null,
        reasonInvalid: reason.length > 0 && !reasonValid,
        resultCap: parsedExtra === null ? null : capWithExtra(config.planValue, parsedExtra),
        parsedExtra,
        canSave,
        handleSubmit,
        isSaving,
        error: setMutation.error ?? resetMutation.error,
    };
}
