import type { AdminProvisionModuleConfig, EventTypeModuleResponseDto, PlanTierModuleConfigDto } from '@/lib/api/types';
import { type ConfigObject, fieldValueFromDraft, isValidNumberDraft, knownConfigFields } from '@/lib/planModuleConfig';

// The vendors settings a provisioned event starts with. They start as the plan's; only the ones an
// admin changes are sent, as exact values for this event (see AdminProvisionEventRequestDto.moduleConfigs).
export const VENDORS_MODULE = 'vendors';

// The type supports vendors unless its row says otherwise; a type without a row has no vendors at all.
export function typeSupportsVendors(matrix: EventTypeModuleResponseDto[] | undefined): boolean {
    const row = matrix?.find((item) => item.moduleKey === VENDORS_MODULE);
    return Boolean(row) && row?.applicability !== 'UNSUPPORTED';
}

// The plan's own vendors config, else the type's default, as the plan grid shows it.
export function planVendorsConfig(planConfigs: PlanTierModuleConfigDto[] | undefined, matrix: EventTypeModuleResponseDto[] | undefined): ConfigObject {
    return (
        planConfigs?.find((row) => row.moduleKey === VENDORS_MODULE)?.defaultConfig ??
        matrix?.find((row) => row.moduleKey === VENDORS_MODULE)?.defaultConfig ??
        {}
    );
}

// The keys whose draft can't be saved: a number outside its range.
export function vendorSettingsErrors(draft: Record<string, string>): string[] {
    return knownConfigFields(VENDORS_MODULE)
        .filter((field) => field.type === 'number' && !isValidNumberDraft(field, draft[field.key] ?? ''))
        .map((field) => field.key);
}

// One setting per value that differs from the plan's.
export function vendorSettingsChanges(planConfig: ConfigObject, draft: Record<string, string>): AdminProvisionModuleConfig[] {
    const changes: AdminProvisionModuleConfig[] = [];
    for (const field of knownConfigFields(VENDORS_MODULE)) {
        const value = fieldValueFromDraft(field, draft[field.key], planConfig[field.key]);
        if (value === undefined || JSON.stringify(value) === JSON.stringify(planConfig[field.key] ?? null)) continue;
        changes.push({ moduleKey: VENDORS_MODULE, configKey: field.key, value });
    }
    return changes;
}
