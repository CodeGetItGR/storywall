'use client';

import { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { useEventTypeModuleMatrix } from '@/hooks/useEventTypeModuleMatrix';
import { useModuleApplicabilityChange } from '@/hooks/useModuleApplicabilityChange';
import { usePlanModuleConfigs } from '@/hooks/usePlanModuleConfigs';
import { visibilityOf } from '@/lib/adminVisibility';
import type { EventTypeModuleApplicability, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { buildPlanModuleGrid, type PlanModuleCell } from '@/lib/planModuleGrid';

export type OpenCell = { cell: Extract<PlanModuleCell, { kind: 'included' | 'excluded' }>; anchor: HTMLElement };

export function usePlanModuleGrid({
    eventTypeKey,
    plans,
    modules,
    unlocks,
    moduleName,
}: {
    eventTypeKey: string;
    plans: PlanTierResponseDto[];
    modules: PlatformModuleResponseDto[];
    unlocks: PaidServiceResponseDto[];
    moduleName: (moduleKey: string) => string;
}) {
    const [showHidden, setShowHidden] = useState(false);
    const [openCell, setOpenCell] = useState<OpenCell | null>(null);

    const columnPlans = useMemo(
        () => plans.filter((plan) => plan.eventTypeKey === eventTypeKey && (showHidden || visibilityOf(plan) === 'LIVE')),
        [eventTypeKey, plans, showHidden],
    );
    const planIds = useMemo(() => columnPlans.map((plan) => plan.id), [columnPlans]);

    const matrixQuery = useEventTypeModuleMatrix(eventTypeKey);
    const configs = usePlanModuleConfigs(planIds);
    const applicability = useModuleApplicabilityChange(eventTypeKey);

    const grid = useMemo(
        () =>
            buildPlanModuleGrid({
                modules,
                matrix: matrixQuery.data ?? [],
                plans: columnPlans,
                configsByPlanId: configs.configsByPlanId,
                unlocks,
            }),
        [columnPlans, configs.configsByPlanId, matrixQuery.data, modules, unlocks],
    );

    const toggleShowHidden = useCallback(() => setShowHidden((current) => !current), []);

    const requestApplicability = useCallback(
        (moduleKey: string, next: EventTypeModuleApplicability) => {
            const row = grid.rows.find((item) => item.moduleKey === moduleKey);
            if (!row) return;
            applicability.request({ moduleKey, moduleName: moduleName(moduleKey), before: row.applicability, after: next });
        },
        [applicability, grid.rows, moduleName],
    );

    const handleCellClick = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
            const { planId, moduleKey } = event.currentTarget.dataset;
            const row = grid.rows.find((item) => item.moduleKey === moduleKey);
            const cell = row?.cells.find((item) => item.planId === planId);
            if (!cell || cell.kind === 'unsupported') return;
            setOpenCell({ cell, anchor: event.currentTarget });
        },
        [grid.rows],
    );
    const closeCell = useCallback(() => setOpenCell(null), []);

    const openCellPlan = useMemo(
        () => (openCell ? (columnPlans.find((plan) => plan.id === openCell.cell.planId) ?? null) : null),
        [columnPlans, openCell],
    );

    return {
        grid,
        showHidden,
        toggleShowHidden,
        isLoading: matrixQuery.isLoading || configs.isLoading,
        error: matrixQuery.error ?? null,
        failedPlanIds: configs.failedPlanIds,
        applicability,
        requestApplicability,
        openCell,
        openCellPlan,
        handleCellClick,
        closeCell,
    };
}
