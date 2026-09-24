'use client';

import type * as React from 'react';
import { useMemo, useState } from 'react';

import { useCreateCoverageOption, useUpdateCoverageOption } from '@/hooks/useAdminCoverageOptions';
import {
    type DurationDraft,
    durationDraftFromOption,
    durationPatchFromDraft,
    isDurationDraftValid,
    newDurationDraft,
    parseDurationMonths,
    parseDurationPrice,
    sortDurationsForAdmin,
} from '@/lib/adminPlanDurations';
import type { PlanTierResponseDto } from '@/lib/api/types';

// The plan editor's Durations section: read-only rows, and one duration open for
// editing at a time. Each change is its own request, separate from the plan's Save.
export function usePlanDurationsEditor(plan: PlanTierResponseDto) {
    const createOption = useCreateCoverageOption();
    const updateOption = useUpdateCoverageOption();
    const [draft, setDraft] = useState<DurationDraft | null>(null);

    const options = useMemo(() => sortDurationsForAdmin(plan.initialOptions), [plan.initialOptions]);
    const editingOption = draft?.optionId ? (options.find((option) => option.id === draft.optionId) ?? null) : null;
    const isPending = createOption.isPending || updateOption.isPending;
    const hasChanges =
        draft !== null && (draft.optionId === null || Object.keys(editingOption ? durationPatchFromDraft(editingOption, draft) : {}).length > 0);
    const canSave = draft !== null && isDurationDraftValid(draft) && hasChanges && !isPending;

    function resetErrors() {
        createOption.reset();
        updateOption.reset();
    }

    function openNew() {
        resetErrors();
        setDraft(newDurationDraft(plan.initialOptions));
    }

    function openEdit(event: React.MouseEvent<HTMLButtonElement>) {
        const option = options.find((item) => item.id === event.currentTarget.dataset.optionId);
        if (!option) return;
        resetErrors();
        setDraft(durationDraftFromOption(option));
    }

    function close() {
        resetErrors();
        setDraft(null);
    }

    function updateDraft(event: React.ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.dataset.field as keyof DurationDraft | undefined;
        const { value } = event.currentTarget;
        if (!field || field === 'optionId') return;
        setDraft((current) => (current ? { ...current, [field]: value } : current));
    }

    function save() {
        if (!draft || !canSave) return;
        const onSuccess = () => setDraft(null);

        if (!editingOption) {
            createOption.mutate(
                {
                    planTierId: plan.id,
                    option: {
                        kind: 'INITIAL',
                        months: parseDurationMonths(draft.months) ?? 0,
                        priceAmountMinor: parseDurationPrice(draft.price) ?? 0,
                        sortOrder: Number(draft.sortOrder),
                    },
                },
                { onSuccess },
            );
            return;
        }

        updateOption.mutate({ planTierId: plan.id, optionId: editingOption.id, patch: durationPatchFromDraft(editingOption, draft) }, { onSuccess });
    }

    // Retiring takes a duration off sale; nothing is ever deleted, so it can be
    // put back later.
    function toggleActive() {
        if (!editingOption || isPending) return;
        updateOption.mutate(
            { planTierId: plan.id, optionId: editingOption.id, patch: { active: !editingOption.active } },
            { onSuccess: () => setDraft(null) },
        );
    }

    // The section sits inside the plan's form: Enter must save this duration,
    // not submit the plan, and Escape closes only this editor.
    function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }

    return {
        options,
        currency: plan.priceCurrency,
        draft,
        editingOption,
        canSave,
        isSaving: isPending,
        error: createOption.error ?? updateOption.error,
        openNew,
        openEdit,
        close,
        updateDraft,
        save,
        toggleActive,
        handleEditorKeyDown,
    };
}

export type PlanDurationsEditor = ReturnType<typeof usePlanDurationsEditor>;
