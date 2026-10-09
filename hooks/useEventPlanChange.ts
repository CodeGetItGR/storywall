'use client';

import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react';

import { useAdminPlanTiers } from '@/hooks/useAdmin';
import { useChangeEventPlan } from '@/hooks/useAdminEvents';
import type { AdminEventDetailDto } from '@/lib/api/types';

// Only the assignable plans sold for this event's type, other than the one it is on.
export function useEventPlanChange(event: AdminEventDetailDto, onDoneAction: () => void) {
    const plansQuery = useAdminPlanTiers('EVENT');
    const mutation = useChangeEventPlan(event.id);
    const plans = useMemo(
        () => (plansQuery.data ?? []).filter((plan) => plan.isAssignable && plan.eventTypeKey === event.eventType && plan.code !== event.plan?.code),
        [event.eventType, event.plan?.code, plansQuery.data],
    );
    const [pickedCode, setPickedCode] = useState('');
    // Falls back to the first plan rather than to empty, so the select always names a real plan.
    const planCode = pickedCode || plans[0]?.code || '';
    const canSave = Boolean(planCode) && !mutation.isPending;

    function handlePlanChange(changeEvent: ChangeEvent<HTMLSelectElement>) {
        setPickedCode(changeEvent.currentTarget.value);
    }

    function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
        submitEvent.preventDefault();
        if (!canSave) return;
        mutation.mutate(planCode, { onSuccess: onDoneAction });
    }

    return {
        plans,
        isLoading: plansQuery.isLoading,
        loadError: plansQuery.error,
        planCode,
        handlePlanChange,
        canSave,
        handleSubmit,
        isSaving: mutation.isPending,
        error: mutation.error,
    };
}
