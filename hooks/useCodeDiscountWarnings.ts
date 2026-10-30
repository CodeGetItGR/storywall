'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDiscountCodeOptions } from '@/hooks/useAdmin';
import { codeRestrictionsFromFormData, HIGH_CODE_DISCOUNT_PERCENT, plansBelowChargeMinimum } from '@/lib/adminCollaborations';
import type { CodeRestrictionsDto, DiscountCodeResponseDto } from '@/lib/api/types';

const NO_RESTRICTIONS: CodeRestrictionsDto = { eventTypeKeys: [], planTierCodes: [] };

export type CodeDiscountWarnings = { isHigh: boolean; belowMinimumPlanNames: string[] };

// Warnings for a code's percent: high, or too steep for some plan's price to be charged.
export function useCodeDiscountWarnings(codePercent: number, restrictions: CodeRestrictionsDto | null): CodeDiscountWarnings {
    const optionsQuery = useDiscountCodeOptions();
    const belowMinimumPlanNames = useMemo(
        () => plansBelowChargeMinimum(optionsQuery.data?.plans ?? [], codePercent, restrictions ?? NO_RESTRICTIONS).map((plan) => plan.name),
        [codePercent, optionsQuery.data?.plans, restrictions],
    );
    return { isHigh: codePercent >= HIGH_CODE_DISCOUNT_PERCENT, belowMinimumPlanNames };
}

// The same warnings for a code form, following the typed percent and the ticked restrictions.
export function useCodeFormDiscountWarnings(code: (CodeRestrictionsDto & { discountPercent: number }) | null) {
    const [values, setValues] = useState(() => ({ codePercent: code?.discountPercent ?? 0, restrictions: code ?? NO_RESTRICTIONS }));

    const handleFormChange = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        const form = event.currentTarget;
        // Read after the render: unticking an event type removes its plan boxes, which the form still holds now.
        window.setTimeout(() => {
            const formData = new FormData(form);
            setValues({ codePercent: Number(formData.get('discountPercent')) || 0, restrictions: codeRestrictionsFromFormData(formData) });
        });
    }, []);

    return { warnings: useCodeDiscountWarnings(values.codePercent, values.restrictions), handleFormChange };
}

// The same warnings for the code picked from a list.
export function usePickedCodeDiscountWarnings(codes: DiscountCodeResponseDto[]) {
    const [pickedCodeId, setPickedCodeId] = useState('');
    const pickedCode = codes.find((code) => code.id === pickedCodeId) ?? null;

    const handleCodeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => setPickedCodeId(event.currentTarget.value), []);

    return { pickedCodeId, handleCodeChange, warnings: useCodeDiscountWarnings(pickedCode?.discountPercent ?? 0, pickedCode) };
}
