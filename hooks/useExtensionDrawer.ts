'use client';

import type * as React from 'react';
import { useState } from 'react';

import { useCreateCoverageOption, useUpdateCoverageOption } from '@/hooks/useAdminCoverageOptions';
import {
    type ExtensionDraft,
    extensionDraftFromRow,
    type ExtensionRow,
    extensionRowsFromPlans,
    isExtensionDraftValid,
    newExtensionDraft,
    parseExtensionPrice,
} from '@/lib/adminExtensions';
import { parseDurationMonths } from '@/lib/adminPlanDurations';
import type { PlanTierResponseDto } from '@/lib/api/types';

// The Paid services page's extension drawer: one extension open at a time,
// written through the plan's coverage-option endpoints. Plan and months are
// fixed once created; the price can change, and retiring takes it off sale
// without deleting it.
export function useExtensionDrawer(plans: PlanTierResponseDto[]) {
    const createOption = useCreateCoverageOption();
    const updateOption = useUpdateCoverageOption();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<ExtensionDraft>(() => newExtensionDraft(plans));

    // Read from the latest plans, so a save or retire shows at once.
    const editing = editingId ? (extensionRowsFromPlans(plans).find((row) => row.option.id === editingId) ?? null) : null;
    const isSaving = createOption.isPending || updateOption.isPending;
    const priceMinor = parseExtensionPrice(draft.price);
    const hasChanges = !editing || priceMinor !== editing.option.priceAmountMinor;
    const canSave = isExtensionDraftValid(draft) && hasChanges && !isSaving;

    function resetErrors() {
        createOption.reset();
        updateOption.reset();
    }

    function openNew() {
        resetErrors();
        setEditingId(null);
        setDraft(newExtensionDraft(plans));
        setOpen(true);
    }

    function openEdit(row: ExtensionRow) {
        resetErrors();
        setEditingId(row.option.id);
        setDraft(extensionDraftFromRow(row));
        setOpen(true);
    }

    function close() {
        setOpen(false);
    }

    function updateDraft(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const field = event.currentTarget.name as keyof ExtensionDraft;
        const { value } = event.currentTarget;
        if (field !== 'planTierId' && field !== 'months' && field !== 'price') return;
        setDraft((current) => ({ ...current, [field]: value }));
    }

    function save(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSave || priceMinor === null) return;

        if (editing) {
            updateOption.mutate(
                { planTierId: editing.plan.id, optionId: editing.option.id, patch: { priceAmountMinor: priceMinor } },
                { onSuccess: close },
            );
            return;
        }

        createOption.mutate(
            {
                planTierId: draft.planTierId,
                // Sort order 0 for all: hosts see a plan's extensions shortest first.
                option: { kind: 'EXTENSION', months: parseDurationMonths(draft.months) ?? 0, priceAmountMinor: priceMinor, sortOrder: 0 },
            },
            { onSuccess: close },
        );
    }

    function toggleActive() {
        if (!editing || isSaving) return;
        updateOption.mutate(
            { planTierId: editing.plan.id, optionId: editing.option.id, patch: { active: !editing.option.active } },
            { onSuccess: close },
        );
    }

    return {
        open,
        editing,
        draft,
        canSave,
        isSaving,
        error: createOption.error ?? updateOption.error,
        openNew,
        openEdit,
        close,
        updateDraft,
        save,
        toggleActive,
    };
}

export type ExtensionDrawerState = ReturnType<typeof useExtensionDrawer>;
