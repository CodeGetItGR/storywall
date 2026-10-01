'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { EMPTY_GIFT_DETAILS, type GiftDetailsInput, giftRequestFromInput } from '@/lib/gift';

// The three gift fields as form state. Inputs carry the field name as `name`.
export function useGiftDetailsInput(initial: GiftDetailsInput = EMPTY_GIFT_DETAILS) {
    const [value, setValue] = useState<GiftDetailsInput>(initial);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const field = event.target.name as keyof GiftDetailsInput;
        const next = event.target.value;
        setValue((current) => ({ ...current, [field]: next }));
    }, []);

    const request = useMemo(() => giftRequestFromInput(value), [value]);

    return { value, setValue, handleChange, request };
}

export type GiftDetailsInputState = ReturnType<typeof useGiftDetailsInput>;
