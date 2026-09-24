'use client';

import type * as React from 'react';
import { useState } from 'react';

import { useCreateCoverageOption } from '@/hooks/useAdminCoverageOptions';
import { parseDurationMonths, parseDurationPrice } from '@/lib/adminPlanDurations';

type DurationRow = { rowId: string; months: string; price: string };

function makeRow(): DurationRow {
    return { rowId: Math.random().toString(36).slice(2), months: '', price: '' };
}

// The durations typed into the create-plan drawer. A new EVENT plan is not on
// sale until it has one, so the drawer requires at least one and creates them
// right after the plan itself.
export function usePlanCreateDurations() {
    const createOption = useCreateCoverageOption();
    const [rows, setRows] = useState<DurationRow[]>(() => [makeRow()]);
    // Rows already created on the server, so a retry after a partial failure
    // doesn't send them twice (the second would be a 409 duplicate).
    const [createdRowIds, setCreatedRowIds] = useState<Set<string>>(() => new Set());

    const parsedMonths = rows.map((row) => parseDurationMonths(row.months));
    const filledMonths = parsedMonths.filter((months): months is number => months !== null);
    const hasDuplicateMonths = new Set(filledMonths).size !== filledMonths.length;
    const isValid =
        rows.length > 0 && !hasDuplicateMonths && rows.every((row, index) => parsedMonths[index] !== null && parseDurationPrice(row.price) !== null);

    function addRow() {
        setRows((current) => [...current, makeRow()]);
    }

    function removeRow(event: React.MouseEvent<HTMLButtonElement>) {
        const { rowId } = event.currentTarget.dataset;
        setRows((current) => (current.length > 1 ? current.filter((row) => row.rowId !== rowId) : current));
    }

    function updateRow(event: React.ChangeEvent<HTMLInputElement>) {
        const { rowId, field } = event.currentTarget.dataset;
        const { value } = event.currentTarget;
        if (field !== 'months' && field !== 'price') return;
        setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, [field]: value } : row)));
    }

    // Sequential so a failure stops at the row that failed and the order the
    // admin typed becomes the display order.
    async function createAll(planTierId: string) {
        for (const [index, row] of rows.entries()) {
            if (createdRowIds.has(row.rowId)) continue;
            await createOption.mutateAsync({
                planTierId,
                option: {
                    kind: 'INITIAL',
                    months: parseDurationMonths(row.months) ?? 0,
                    priceAmountMinor: parseDurationPrice(row.price) ?? 0,
                    sortOrder: index,
                },
            });
            setCreatedRowIds((current) => new Set(current).add(row.rowId));
        }
    }

    function reset() {
        setRows([makeRow()]);
        setCreatedRowIds(new Set());
        createOption.reset();
    }

    return {
        rows,
        isValid,
        hasDuplicateMonths,
        isCreating: createOption.isPending,
        error: createOption.error,
        addRow,
        removeRow,
        updateRow,
        createAll,
        reset,
    };
}

export type PlanCreateDurations = ReturnType<typeof usePlanCreateDurations>;
