'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { GuestOfferSettingsDto } from '@/lib/api/types';

export const adminGuestOfferKeys = {
    settings: ['admin', 'guest-offer'] as const,
    stats: (days: number) => ['admin', 'guest-offer', 'stats', days] as const,
};

interface GuestOfferDraft {
    enabled: boolean;
    discountPercent: string;
    validityMonths: string;
}

function toDraft(settings: GuestOfferSettingsDto): GuestOfferDraft {
    return {
        enabled: settings.enabled,
        discountPercent: String(settings.discountPercent),
        validityMonths: String(settings.validityMonths),
    };
}

function wholeNumberIn(value: string, min: number, max: number): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

// The guest offer terms form: loads the settings, keeps an editable draft, saves it whole.
export function useAdminGuestOffer() {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: adminGuestOfferKeys.settings,
        queryFn: () => api.get<GuestOfferSettingsDto>(endpoints.admin.guestOffer),
    });
    // Only the fields the admin changed; the rest read through from the saved settings.
    const [edits, setEdits] = useState<Partial<GuestOfferDraft>>({});
    const draft: GuestOfferDraft | null = query.data ? { ...toDraft(query.data), ...edits } : null;

    const save = useMutation({
        mutationFn: (dto: GuestOfferSettingsDto) => api.put<GuestOfferSettingsDto>(endpoints.admin.guestOffer, dto),
        onSuccess: (saved) => {
            queryClient.setQueryData(adminGuestOfferKeys.settings, saved);
            setEdits({});
        },
    });

    const percent = draft ? wholeNumberIn(draft.discountPercent, 1, 99) : null;
    const months = draft ? wholeNumberIn(draft.validityMonths, 1, 60) : null;
    const isDirty =
        draft !== null &&
        query.data !== undefined &&
        (draft.enabled !== query.data.enabled ||
            draft.discountPercent !== String(query.data.discountPercent) ||
            draft.validityMonths !== String(query.data.validityMonths));

    const setEnabled = useCallback((enabled: boolean) => setEdits((current) => ({ ...current, enabled })), []);
    const setDiscountPercent = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setEdits((current) => ({ ...current, discountPercent: event.target.value })),
        [],
    );
    const setValidityMonths = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => setEdits((current) => ({ ...current, validityMonths: event.target.value })),
        [],
    );

    const enabled = draft?.enabled ?? false;
    const { mutate } = save;
    const submit = useCallback(
        (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (percent === null || months === null) return;
            mutate({ enabled, discountPercent: percent, validityMonths: months });
        },
        [enabled, months, mutate, percent],
    );

    return {
        isLoading: query.isLoading,
        loadFailed: query.isError,
        draft,
        percentInvalid: draft !== null && percent === null,
        monthsInvalid: draft !== null && months === null,
        canSave: isDirty && percent !== null && months !== null && !save.isPending,
        isSaving: save.isPending,
        saveFailed: save.isError,
        saved: save.isSuccess && !isDirty,
        setEnabled,
        setDiscountPercent,
        setValidityMonths,
        submit,
    };
}
