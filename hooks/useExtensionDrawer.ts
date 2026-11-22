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
    plansSellingLength,
} from '@/lib/adminExtensions';
import { parseDurationMonths } from '@/lib/adminPlanDurations';
import type { PlanTierResponseDto } from '@/lib/api/types';

// The Paid services page's extension drawer: one extension open at a time,
// written through the plan's coverage-option endpoints. A new extension can go
// on several plans in one save. Plan and months are fixed once created; the
// price can change, and retiring takes it off sale without deleting it.
export function useExtensionDrawer(plans: PlanTierResponseDto[]) {
    const createOption = useCreateCoverageOption();
    const updateOption = useUpdateCoverageOption();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [picked, setPicked] = useState<ExtensionDraft>(newExtensionDraft);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<unknown>(null);

    // Read from the latest plans, so a save or retire shows at once.
    const editing = editingId ? (extensionRowsFromPlans(plans).find((row) => row.option.id === editingId) ?? null) : null;
    // A plan that already sells the typed length can't be picked, so it drops out of the pick.
    const sellingLength = editing ? new Set<string>() : plansSellingLength(plans, picked.months);
    const draft: ExtensionDraft = { ...picked, planTierIds: picked.planTierIds.filter((id) => !sellingLength.has(id)) };
    const isSaving = creating || updateOption.isPending;
    const priceMinor = parseExtensionPrice(draft.price);
    const hasChanges = !editing || priceMinor !== editing.option.priceAmountMinor;
    const canSave = isExtensionDraftValid(draft) && hasChanges && !isSaving;

    function resetErrors() {
        setCreateError(null);
        createOption.reset();
        updateOption.reset();
    }

    function openNew() {
        resetErrors();
        setEditingId(null);
        setPicked(newExtensionDraft());
        setOpen(true);
    }

    function openEdit(row: ExtensionRow) {
        resetErrors();
        setEditingId(row.option.id);
        setPicked(extensionDraftFromRow(row));
        setOpen(true);
    }

    function close() {
        setOpen(false);
    }

    function updateDraft(event: React.ChangeEvent<HTMLInputElement>) {
        const field = event.currentTarget.name;
        const { value } = event.currentTarget;
        if (field !== 'months' && field !== 'price') return;
        setPicked((current) => ({ ...current, [field]: value }));
    }

    function togglePlan(planTierId: string) {
        if (editing) return;
        setPicked((current) => ({
            ...current,
            planTierIds: current.planTierIds.includes(planTierId)
                ? current.planTierIds.filter((id) => id !== planTierId)
                : [...current.planTierIds, planTierId],
        }));
    }

    async function createOnPlans(planTierIds: string[], months: number, amountMinor: number) {
        setCreating(true);
        setCreateError(null);
        // Sort order 0 for all: hosts see a plan's extensions shortest first.
        const results = await Promise.allSettled(
            planTierIds.map((planTierId) =>
                createOption.mutateAsync({ planTierId, option: { kind: 'EXTENSION', months, priceAmountMinor: amountMinor, sortOrder: 0 } }),
            ),
        );
        setCreating(false);
        const failed = planTierIds.filter((_, index) => results[index].status === 'rejected');
        if (failed.length === 0) {
            close();
            return;
        }
        // The plans that saved are done; only the ones that failed stay picked, to try again.
        setPicked((current) => ({ ...current, planTierIds: failed }));
        setCreateError(results.find((result) => result.status === 'rejected')?.reason ?? null);
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

        void createOnPlans(draft.planTierIds, parseDurationMonths(draft.months) ?? 0, priceMinor);
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
        sellingLength,
        canSave,
        isSaving,
        error: createError ?? updateOption.error,
        openNew,
        openEdit,
        close,
        updateDraft,
        togglePlan,
        save,
        toggleActive,
    };
}

export type ExtensionDrawerState = ReturnType<typeof useExtensionDrawer>;
