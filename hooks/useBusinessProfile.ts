'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getFieldErrors } from '@/lib/api/errors';
import type { BusinessProfileRequestDto, BusinessProfileResponseDto } from '@/lib/api/types';
import {
    type BusinessProfileField,
    type BusinessProfileForm,
    businessProfileKeys,
    checkoutBuyerNotice,
    formatVatNumber,
    isBusinessBuyer,
    toBusinessProfileForm,
    toBusinessProfileRequest,
    VIES_COUNTRY_CODES,
    viesCountryName,
} from '@/lib/businessProfile';

async function fetchBusinessProfile(): Promise<BusinessProfileResponseDto | null> {
    try {
        return await api.get<BusinessProfileResponseDto>(endpoints.me.businessProfile);
    } catch (error) {
        // 404 means the account has no business profile.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}

// Guest accounts can't hold a business profile (403), so they never ask.
export function useBusinessProfile() {
    const { user } = useAuth();
    const canHaveProfile = user?.role === 'USER' || user?.role === 'ADMIN';
    const query = useQuery({
        queryKey: businessProfileKeys.mine,
        queryFn: fetchBusinessProfile,
        enabled: canHaveProfile,
    });
    const profile = query.data ?? null;

    return {
        canHaveProfile,
        isBusiness: isBusinessBuyer(profile),
        isLoading: canHaveProfile && query.isLoading,
        profile,
        query,
    };
}

type FieldErrors = Partial<Record<BusinessProfileField, string>>;

// Profile settings: read-only summary, an edit dialog, and a remove confirmation.
export function useBusinessProfileSettings() {
    const { canHaveProfile, isLoading, profile, query } = useBusinessProfile();
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const locale = useLocale();
    const t = useTranslations('ProfilePage.business');
    const northernIreland = t('northernIreland');
    const [isEditing, setIsEditing] = useState(false);
    const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
    const [form, setForm] = useState<BusinessProfileForm>(() => toBusinessProfileForm(profile));
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const saveMutation = useMutation({
        mutationFn: (body: BusinessProfileRequestDto) => api.put<BusinessProfileResponseDto>(endpoints.me.businessProfile, body),
        onSuccess: (saved) => {
            queryClient.setQueryData(businessProfileKeys.mine, saved);
            setIsEditing(false);
        },
        onError: (error) => setFieldErrors((getFieldErrors(error) ?? {}) as FieldErrors),
    });

    const removeMutation = useMutation({
        mutationFn: () => api.del<void>(endpoints.me.businessProfile),
        onSuccess: () => {
            queryClient.setQueryData(businessProfileKeys.mine, null);
            setIsConfirmingRemove(false);
            setIsEditing(false);
        },
    });

    const { mutate: save, reset: resetSave } = saveMutation;
    const { mutate: remove, reset: resetRemove } = removeMutation;

    const openEditor = useCallback(() => {
        setForm(toBusinessProfileForm(profile));
        setFieldErrors({});
        resetSave();
        setIsEditing(true);
    }, [profile, resetSave]);

    const closeEditor = useCallback(() => setIsEditing(false), []);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const field = event.target.name as BusinessProfileField;
        const value = event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }, []);

    const handleSubmit = useCallback(
        (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setFieldErrors({});
            save(toBusinessProfileRequest(form));
        },
        [form, save],
    );

    const askRemove = useCallback(() => {
        resetRemove();
        setIsConfirmingRemove(true);
    }, [resetRemove]);

    const cancelRemove = useCallback(() => setIsConfirmingRemove(false), []);
    const confirmRemove = useCallback(() => remove(), [remove]);

    const countryOptions = useMemo(
        () =>
            VIES_COUNTRY_CODES.map((code) => ({ code, name: viesCountryName(locale, code, northernIreland) })).sort((a, b) =>
                a.name.localeCompare(b.name, locale),
            ),
        [locale, northernIreland],
    );
    const countryName = profile ? viesCountryName(locale, profile.countryCode, northernIreland) : null;

    return {
        canHaveProfile,
        countryName,
        countryOptions,
        isLoading,
        loadError: query.error ? toErrorMessage(query.error) : null,
        profile,
        // Edit dialog
        isEditing,
        form,
        fieldErrors,
        saveError: saveMutation.error ? toErrorMessage(saveMutation.error) : null,
        isSaving: saveMutation.isPending,
        openEditor,
        closeEditor,
        handleFieldChange,
        handleSubmit,
        // Remove confirmation
        isConfirmingRemove,
        removeError: removeMutation.error ? toErrorMessage(removeMutation.error) : null,
        isRemoving: removeMutation.isPending,
        askRemove,
        cancelRemove,
        confirmRemove,
    };
}

export type BusinessProfileSettings = ReturnType<typeof useBusinessProfileSettings>;

// Checkout: which buyer notice to show, with the details the business notice names.
export function useCheckoutBuyer() {
    const { profile } = useBusinessProfile();
    return {
        notice: checkoutBuyerNotice(profile),
        legalName: profile?.legalName ?? '',
        vatNumber: profile ? formatVatNumber(profile) : '',
    };
}
