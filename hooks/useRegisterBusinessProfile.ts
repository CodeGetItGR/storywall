'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useViesCountryOptions } from '@/hooks/useBusinessProfile';
import { ApiError } from '@/lib/api/client';
import { getFieldErrors } from '@/lib/api/errors';
import type { BusinessProfileRequestDto } from '@/lib/api/types';
import {
    type BusinessProfileField,
    type BusinessProfileForm,
    EMPTY_BUSINESS_PROFILE_FORM,
    invalidBusinessProfileFields,
    toBusinessProfileRequest,
    toSignupBusinessFieldErrors,
} from '@/lib/businessProfile';

type FieldErrors = Partial<Record<BusinessProfileField, string>>;

// Optional business details at signup. Collapsed by default; only sent when ticked.
export function useRegisterBusinessProfile() {
    const t = useTranslations('ProfilePage.business');
    const toErrorMessage = useApiErrorMessage();
    const countryOptions = useViesCountryOptions();
    const [isEnabled, setIsEnabled] = useState(false);
    const [form, setForm] = useState<BusinessProfileForm>(EMPTY_BUSINESS_PROFILE_FORM);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [sectionError, setSectionError] = useState<string | null>(null);

    const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setIsEnabled(event.target.checked);
        setFieldErrors({});
        setSectionError(null);
    }, []);

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const field = event.target.name as BusinessProfileField;
        const value = event.target.value;
        setForm((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setSectionError(null);
    }, []);

    // The request body, null when not ticked, or false when a field needs fixing first.
    const prepareRequest = useCallback((): BusinessProfileRequestDto | null | false => {
        setSectionError(null);
        if (!isEnabled) return null;
        const invalid = invalidBusinessProfileFields(form);
        setFieldErrors(Object.fromEntries(invalid.map((field) => [field, t('fieldRequired')])));
        return invalid.length > 0 ? false : toBusinessProfileRequest(form);
    }, [form, isEnabled, t]);

    // Puts a signup 400 about the business details on this section. Returns
    // false when the error belongs to the rest of the form.
    const handleSignupError = useCallback(
        (error: unknown): boolean => {
            if (!isEnabled || !(error instanceof ApiError) || error.status !== 400) return false;
            const allErrors = getFieldErrors(error) ?? {};
            const businessErrors = toSignupBusinessFieldErrors(allErrors);
            const hasBusinessErrors = Object.keys(businessErrors).length > 0;
            // Errors on other fields only: not ours.
            if (!hasBusinessErrors && Object.keys(allErrors).length > 0) return false;
            setFieldErrors(businessErrors);
            setSectionError(hasBusinessErrors ? null : toErrorMessage(error));
            return true;
        },
        [isEnabled, toErrorMessage],
    );

    return {
        isEnabled,
        form,
        fieldErrors,
        sectionError,
        countryOptions,
        handleToggle,
        handleFieldChange,
        prepareRequest,
        handleSignupError,
    };
}

export type RegisterBusinessProfile = ReturnType<typeof useRegisterBusinessProfile>;
