'use client';

import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDeleteVendorLogo, useSaveVendorProfile, useUploadVendorLogo } from '@/hooks/useVendorProfile';
import type { PartnerRole, VendorProfileDto, VendorProfileRequestDto } from '@/lib/api/types';
import { isValidVendorLink, VENDOR_BUSINESS_NAME_MAX } from '@/lib/vendors';

type Field = keyof VendorProfileRequestDto;
type FieldErrors = Partial<Record<Field, string>>;

function initialValues(profile: VendorProfileDto | null, defaultType: PartnerRole): VendorProfileRequestDto {
    return {
        businessName: profile?.businessName ?? '',
        vendorType: profile?.vendorType ?? defaultType,
        link: profile?.link ?? '',
    };
}

// The vendor profile sheet: first join (no profile yet) and the profile page's edit.
export function useVendorProfileForm({
    profile,
    defaultType,
    onSaved,
}: {
    profile: VendorProfileDto | null;
    defaultType: PartnerRole;
    onSaved: () => void;
}) {
    const t = useTranslations('Vendors.profile');
    const toErrorMessage = useApiErrorMessage();
    const save = useSaveVendorProfile();
    const uploadLogo = useUploadVendorLogo();
    const deleteLogo = useDeleteVendorLogo();
    const [values, setValues] = useState(() => initialValues(profile, defaultType));
    const [logo, setLogo] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);

    const setField = useCallback((field: Field, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const request: VendorProfileRequestDto = {
                businessName: values.businessName.trim(),
                vendorType: values.vendorType,
                link: values.link.trim(),
            };
            const errors: FieldErrors = {};
            if (!request.businessName) errors.businessName = t('errors.businessNameRequired');
            else if (request.businessName.length > VENDOR_BUSINESS_NAME_MAX) errors.businessName = t('errors.businessNameTooLong', { max: VENDOR_BUSINESS_NAME_MAX });
            if (!isValidVendorLink(request.link)) errors.link = t('errors.linkInvalid');
            setFieldErrors(errors);
            setError(null);
            if (Object.keys(errors).length > 0) return;

            try {
                await save.mutateAsync(request);
                if (logo) await uploadLogo.mutateAsync(logo);
                else if (removeLogo) await deleteLogo.mutateAsync();
                onSaved();
            } catch (submitError) {
                setError(toErrorMessage(submitError));
            }
        },
        [deleteLogo, logo, onSaved, removeLogo, save, t, toErrorMessage, uploadLogo, values],
    );

    return {
        values,
        setField,
        logo,
        setLogo,
        removeLogo,
        setRemoveLogo,
        fieldErrors,
        error,
        isSaving: save.isPending || uploadLogo.isPending || deleteLogo.isPending,
        handleSubmit,
    };
}
