'use client';

import type { MouseEvent } from 'react';

import { ModuleApplicabilityPill } from '@/components/admin/plans/ModuleApplicabilityPill';
import { PlanModuleGridCell } from '@/components/admin/plans/PlanModuleGridCell';
import type { EventTypeModuleApplicability } from '@/lib/api/types';
import type { PlanModuleGridRow as GridRow } from '@/lib/planModuleGrid';
import { cn } from '@/lib/utils';

export function PlanModuleGridRow({
    row,
    moduleName,
    failedPlanIds,
    onRequestApplicabilityAction,
    onCellClickAction,
}: {
    row: GridRow;
    moduleName: string;
    failedPlanIds: string[];
    onRequestApplicabilityAction: (moduleKey: string, next: EventTypeModuleApplicability) => void;
    onCellClickAction: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const unsupported = row.applicability === 'UNSUPPORTED';

    return (
        <tr className={cn('border-b border-border last:border-b-0', unsupported && 'opacity-55')}>
            {/* Module */}
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left align-top">
                <p className="text-[13px] font-semibold text-ink">{moduleName}</p>
                <div className="mt-1">
                    <ModuleApplicabilityPill moduleKey={row.moduleKey} value={row.applicability} onRequestChangeAction={onRequestApplicabilityAction} />
                </div>
            </th>
            {/* Plan cells */}
            {row.cells.map((cell) => (
                <PlanModuleGridCell key={cell.planId} cell={cell} failed={failedPlanIds.includes(cell.planId)} onClickAction={onCellClickAction} />
            ))}
        </tr>
    );
}
