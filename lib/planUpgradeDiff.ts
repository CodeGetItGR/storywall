import type { PlanTierResponseDto } from '@/lib/api/types';

export type PlanUpgradeLimitKey = 'storage' | 'members';

export type PlanUpgradeLimitChange = {
    key: PlanUpgradeLimitKey;
    current: number | null;
    target: number | null;
};

export type PlanUpgradeDiff = {
    limitChanges: PlanUpgradeLimitChange[];
    addedModuleKeys: string[];
    removedModuleKeys: string[];
};

// What the target plan changes: storage, members and modules. Coverage isn't a
// plan fact any more; the upgrade's own duration says how many months it adds.
export function buildPlanUpgradeDiff(currentPlan: PlanTierResponseDto, targetPlan: PlanTierResponseDto): PlanUpgradeDiff {
    const limitChanges: PlanUpgradeLimitChange[] = [
        { key: 'storage', current: currentPlan.storageBytes, target: targetPlan.storageBytes },
        { key: 'members', current: currentPlan.maxMembers, target: targetPlan.maxMembers },
    ].filter((change) => change.current !== change.target) as PlanUpgradeLimitChange[];

    const currentModuleKeys = new Set(currentPlan.moduleKeys);
    const targetModuleKeys = new Set(targetPlan.moduleKeys);

    return {
        limitChanges,
        addedModuleKeys: targetPlan.moduleKeys.filter((moduleKey) => !currentModuleKeys.has(moduleKey)),
        removedModuleKeys: currentPlan.moduleKeys.filter((moduleKey) => !targetModuleKeys.has(moduleKey)),
    };
}
