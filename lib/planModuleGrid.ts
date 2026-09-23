import type {
    EventTypeModuleApplicability,
    EventTypeModuleResponseDto,
    PaidServiceResponseDto,
    PlanTierModuleConfigDto,
    PlanTierResponseDto,
    PlatformModuleResponseDto,
} from '@/lib/api/types';
import type { ConfigObject } from '@/lib/planModuleConfig';

export type PlanModuleCell =
    | { planId: string; moduleKey: string; kind: 'unsupported' }
    | { planId: string; moduleKey: string; kind: 'included'; config: ConfigObject; seedConfig: ConfigObject }
    | { planId: string; moduleKey: string; kind: 'excluded'; config: ConfigObject; seedConfig: ConfigObject; unlock: PaidServiceResponseDto | null };

export type PlanModuleGridRow = {
    moduleKey: string;
    module: PlatformModuleResponseDto;
    applicability: EventTypeModuleApplicability;
    seedConfig: ConfigObject;
    cells: PlanModuleCell[];
};

export type PlanModuleGridColumn = { plan: PlanTierResponseDto };

export type PlanModuleGrid = {
    columns: PlanModuleGridColumn[];
    rows: PlanModuleGridRow[];
    supportedCount: number;
    unsupportedCount: number;
};

function unlockFor(unlocks: PaidServiceResponseDto[], planId: string, moduleKey: string): PaidServiceResponseDto | null {
    return (
        unlocks.find(
            (service) =>
                service.kind === 'MODULE_UNLOCK' &&
                service.isAssignable &&
                service.grantsModuleKey === moduleKey &&
                (service.planTierIds.length === 0 || service.planTierIds.includes(planId)),
        ) ?? null
    );
}

// Modules missing from the matrix are treated as unsupported: the type has no
// row for them, so no event of that type can ever get one.
export function buildPlanModuleGrid({
    modules,
    matrix,
    plans,
    configsByPlanId,
    unlocks,
}: {
    modules: PlatformModuleResponseDto[];
    matrix: EventTypeModuleResponseDto[];
    plans: PlanTierResponseDto[];
    configsByPlanId: Map<string, PlanTierModuleConfigDto[]>;
    unlocks: PaidServiceResponseDto[];
}): PlanModuleGrid {
    const orderedPlans = [...plans].sort((left, right) => left.sortOrder - right.sortOrder);
    const orderedModules = [...modules].sort((left, right) => left.sortOrder - right.sortOrder);
    const matrixByKey = new Map(matrix.map((row) => [row.moduleKey, row]));

    let supportedCount = 0;
    let unsupportedCount = 0;

    const rows: PlanModuleGridRow[] = orderedModules.map((module) => {
        const matrixRow = matrixByKey.get(module.moduleKey);
        const applicability = matrixRow?.applicability ?? 'UNSUPPORTED';
        const seedConfig = matrixRow?.defaultConfig ?? {};
        if (applicability === 'UNSUPPORTED') unsupportedCount += 1;
        else supportedCount += 1;

        const cells: PlanModuleCell[] = orderedPlans.map((plan) => {
            if (applicability === 'UNSUPPORTED') return { planId: plan.id, moduleKey: module.moduleKey, kind: 'unsupported' };
            const configRow = configsByPlanId.get(plan.id)?.find((row) => row.moduleKey === module.moduleKey);
            const config = configRow?.defaultConfig ?? seedConfig;
            if (plan.moduleKeys.includes(module.moduleKey)) {
                return { planId: plan.id, moduleKey: module.moduleKey, kind: 'included', config, seedConfig };
            }
            return {
                planId: plan.id,
                moduleKey: module.moduleKey,
                kind: 'excluded',
                config,
                seedConfig,
                unlock: unlockFor(unlocks, plan.id, module.moduleKey),
            };
        });

        return { moduleKey: module.moduleKey, module, applicability, seedConfig, cells };
    });

    return { columns: orderedPlans.map((plan) => ({ plan })), rows, supportedCount, unsupportedCount };
}
