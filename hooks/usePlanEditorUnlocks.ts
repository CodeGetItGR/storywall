'use client';

import { useCreate, useUpdate } from '@refinedev/core';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';

import { adminKeys } from '@/hooks/useAdmin';
import { appConfigKeys } from '@/hooks/useAppConfig';
import type { UnlockDraft } from '@/lib/adminPlanEditor';
import { codeFromName, defaultCurrency, priceInputToMinor } from '@/lib/adminPlanForm';
import type { PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

type UsePlanEditorUnlocksArgs = {
    plan: PlanTierResponseDto;
    eventPlans: PlanTierResponseDto[];
    paidServices: PaidServiceResponseDto[];
    orderedModules: PlatformModuleResponseDto[];
    unlockDraft: UnlockDraft | null;
    setUnlockDraftAction: (next: UnlockDraft | null | ((current: UnlockDraft | null) => UnlockDraft | null)) => void;
};

export function usePlanEditorUnlocks({
    plan,
    eventPlans,
    paidServices,
    orderedModules,
    unlockDraft,
    setUnlockDraftAction,
}: UsePlanEditorUnlocksArgs) {
    const t = useTranslations('AdminPage');
    const queryClient = useQueryClient();
    // The admin drawer reads paid services through useAdminPaidServices' custom query key,
    // not refine's own resource-keyed cache — refine's automatic invalidation on mutate
    // never touches it, so the "Sell as add-on" badges here go stale until a full reload
    // unless we invalidate adminKeys ourselves (same reason useDeletePaidService does it).
    const invalidateAdminPaidServices = () => {
        queryClient.invalidateQueries({ queryKey: adminKeys.all });
        queryClient.invalidateQueries({ queryKey: appConfigKeys.all });
    };
    const createPaidService = useCreate<PaidServiceResponseDto>({ mutationOptions: { onSuccess: invalidateAdminPaidServices } });
    const updatePaidService = useUpdate<PaidServiceResponseDto>({ mutationOptions: { onSuccess: invalidateAdminPaidServices } });

    const moduleUnlocks = useMemo(
        () => paidServices.filter((service) => service.kind === 'MODULE_UNLOCK' && service.grantsModuleKey && service.isAssignable),
        [paidServices]
    );

    function unlockAppliesToPlan(service: PaidServiceResponseDto) {
        return service.planTierIds.length === 0 || service.planTierIds.includes(plan.id);
    }

    async function addUnlockToPlan(service: PaidServiceResponseDto) {
        if (unlockAppliesToPlan(service)) return;
        await updatePaidService.mutateAsync({
            resource: 'paid-services',
            id: service.id,
            values: { planTierIds: [...service.planTierIds, plan.id] },
        });
    }

    async function removeUnlockFromPlan(service: PaidServiceResponseDto) {
        if (!unlockAppliesToPlan(service)) return;

        const remainingPlanIds =
            service.planTierIds.length === 0
                ? eventPlans.filter((eventPlan) => eventPlan.id !== plan.id).map((eventPlan) => eventPlan.id)
                : service.planTierIds.filter((id) => id !== plan.id);

        await updatePaidService.mutateAsync({
            resource: 'paid-services',
            id: service.id,
            values: remainingPlanIds.length > 0 ? { planTierIds: remainingPlanIds } : { isAssignable: false, isPublic: false },
        });
    }

    function handleUnlockAction(event: React.MouseEvent<HTMLButtonElement>) {
        const service = moduleUnlocks.find((item) => item.id === event.currentTarget.dataset.serviceId);
        if (!service) return;
        if (event.currentTarget.dataset.action === 'remove') void removeUnlockFromPlan(service);
        else void addUnlockToPlan(service);
    }

    function openUnlockEditor(event: React.MouseEvent<HTMLButtonElement>) {
        const moduleKey = event.currentTarget.dataset.moduleKey;
        const moduleItem = orderedModules.find((item) => item.moduleKey === moduleKey);
        if (!moduleKey || !moduleItem) return;
        setUnlockDraftAction({
            moduleKey,
            moduleName: moduleItem.name,
            name: t('plans.modules.defaultAddonName', { module: moduleItem.name }),
            description: '',
            price: '0',
            priceCurrency: defaultCurrency(plan),
            billingPeriod: 'MONTHLY',
        });
    }

    const closeUnlockEditor = useCallback(() => setUnlockDraftAction(null), [setUnlockDraftAction]);

    function updateUnlockDraft(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const field = event.currentTarget.dataset.field;
        const { value } = event.currentTarget;
        if (!field) return;
        setUnlockDraftAction((current) => (current ? { ...current, [field]: value } : current));
    }

    async function createUnlock() {
        if (!unlockDraft) return;

        await createPaidService.mutateAsync({
            resource: 'paid-services',
            values: {
                code: codeFromName(
                    `unlock ${plan.code} ${unlockDraft.moduleKey}`,
                    paidServices.map((service) => service.code)
                ),
                kind: 'MODULE_UNLOCK',
                name: unlockDraft.name.trim(),
                description: unlockDraft.description.trim() || null,
                sortOrder: Math.max(-1, ...paidServices.map((service) => service.sortOrder)) + 1,
                isAssignable: true,
                isPublic: true,
                priceAmountMinor: priceInputToMinor(unlockDraft.price) ?? 0,
                priceCurrency: unlockDraft.priceCurrency.trim().toUpperCase(),
                billingPeriod: unlockDraft.billingPeriod,
                grantsStorageBytes: null,
                grantsModuleKey: unlockDraft.moduleKey,
                planTierIds: [plan.id],
            },
        });
        setUnlockDraftAction(null);
    }

    const canCreateUnlock = Boolean(unlockDraft?.name.trim() && unlockDraft.priceCurrency.trim()) && !createPaidService.mutation.isPending;

    function handleCreateUnlockClick() {
        void createUnlock();
    }

    return {
        moduleUnlocks,
        createPaidService,
        updatePaidService,
        openUnlockEditor,
        closeUnlockEditor,
        updateUnlockDraft,
        handleUnlockAction,
        handleCreateUnlockClick,
        canCreateUnlock,
    };
}
