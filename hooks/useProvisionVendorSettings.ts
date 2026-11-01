'use client';

import { useCallback, useMemo, useState } from 'react';

import { useConfigValueLabels } from '@/hooks/useConfigValueLabels';
import { useEventTypeModuleMatrix } from '@/hooks/useEventTypeModuleMatrix';
import { usePlanModuleConfigs } from '@/hooks/usePlanModuleConfigs';
import type { PartnerRole, PlanTierResponseDto } from '@/lib/api/types';
import { describeConfigValue, knownConfigFields, knownDraftFromConfig, toggleTypeDraft } from '@/lib/planModuleConfig';
import { planVendorsConfig, typeSupportsVendors, VENDORS_MODULE, vendorSettingsChanges, vendorSettingsErrors } from '@/lib/provisionVendorSettings';

type DraftState = { planId: string; draft: Record<string, string> };

// The provision form's vendors settings: the plan's, until an admin changes one. A new plan starts
// them over from its own. Only changed ones are sent; on a plan without vendors they turn vendors on.
export function useProvisionVendorSettings(plan: PlanTierResponseDto | null, eventTypeKey: string) {
    const labels = useConfigValueLabels();
    const matrixQuery = useEventTypeModuleMatrix(eventTypeKey || null);
    const planIds = useMemo(() => (plan ? [plan.id] : []), [plan]);
    const { configsByPlanId, isLoading } = usePlanModuleConfigs(planIds);
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<DraftState | null>(null);

    const fields = knownConfigFields(VENDORS_MODULE);
    const isSupported = Boolean(plan) && typeSupportsVendors(matrixQuery.data);
    const planConfig = useMemo(
        () => planVendorsConfig(plan ? configsByPlanId.get(plan.id) : undefined, matrixQuery.data),
        [configsByPlanId, matrixQuery.data, plan],
    );
    const isReady = isSupported && !isLoading;
    const draft = useMemo(
        () => (plan && state?.planId === plan.id ? state.draft : knownDraftFromConfig(VENDORS_MODULE, planConfig)),
        [plan, planConfig, state],
    );
    const errorKeys = isReady ? vendorSettingsErrors(draft) : [];
    const moduleConfigs = isReady && errorKeys.length === 0 ? vendorSettingsChanges(planConfig, draft) : [];
    const planHasVendors = plan?.moduleKeys.includes(VENDORS_MODULE) ?? false;
    // What the review step lists: each changed setting in words.
    const changes = moduleConfigs.map((config) => {
        const field = fields.find((item) => item.key === config.configKey)!;
        return { key: config.configKey, label: labels.field(config.configKey), value: describeConfigValue(field, config.value, labels) };
    });

    const update = useCallback(
        (change: (current: Record<string, string>) => Record<string, string>) => {
            if (plan) setState({ planId: plan.id, draft: change(draft) });
        },
        [draft, plan],
    );
    const handleValueChange = useCallback((key: string, value: string) => update((current) => ({ ...current, [key]: value })), [update]);
    const handleTypeChange = useCallback(
        (key: string, role: PartnerRole, checked: boolean) => update((current) => ({ ...current, [key]: toggleTypeDraft(current[key] ?? '', role, checked) })),
        [update],
    );
    const toggleOpen = useCallback(() => setOpen((current) => !current), []);
    const reset = useCallback(() => {
        setState(null);
        setOpen(false);
    }, []);

    return {
        isSupported,
        isReady,
        open,
        toggleOpen,
        fields,
        draft,
        errorKeys,
        planHasVendors,
        moduleConfigs,
        changes,
        // Settings on a plan without vendors turn vendors on for this event.
        turnsVendorsOn: !planHasVendors && moduleConfigs.length > 0,
        handleValueChange,
        handleTypeChange,
        reset,
    };
}

export type ProvisionVendorSettings = ReturnType<typeof useProvisionVendorSettings>;
