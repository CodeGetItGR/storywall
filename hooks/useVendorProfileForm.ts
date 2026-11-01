'use client';

import { useTranslations } from 'next-intl';
import type { SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import {
    useDeleteVendorBanner,
    useDeleteVendorLogo,
    useSaveVendorProfile,
    useUploadVendorBanner,
    useUploadVendorLogo,
} from '@/hooks/useVendorProfile';
import type { PartnerRole, VendorProfileDto, VendorProfileRequestDto, VendorServiceTag } from '@/lib/api/types';
import {
    instagramHandle,
    isValidVendorEmail,
    isValidVendorPhone,
    isValidVendorWebsite,
    serviceTagsForType,
    VENDOR_BUSINESS_NAME_MAX,
    VENDOR_SERVICE_TAGS_MAX,
} from '@/lib/vendors';

// The sheet's text inputs, kept as typed until save.
export type VendorProfileTextField = 'businessName' | 'description' | 'instagram' | 'website' | 'contactPhone' | 'contactEmail';
type Values = Record<VendorProfileTextField, string> & {
    vendorType: PartnerRole;
    serviceTags: VendorServiceTag[];
    showPhone: boolean;
    showEmail: boolean;
};
type FieldErrors = Partial<Record<VendorProfileTextField, string>>;

// The type is not editable: it stays the profile's own, or the joining link's on a first save.
function initialValues(profile: VendorProfileDto | null, defaultType: PartnerRole): Values {
    const vendorType = profile?.vendorType ?? defaultType;
    return {
        businessName: profile?.businessName ?? '',
        vendorType,
        description: profile?.description ?? '',
        serviceTags: serviceTagsForType(profile?.serviceTags, vendorType),
        instagram: profile?.instagram ? `@${profile.instagram}` : '',
        website: profile?.website ?? '',
        contactPhone: profile?.contactPhone ?? '',
        contactEmail: profile?.contactEmail ?? '',
        showPhone: profile?.showPhone ?? false,
        showEmail: profile?.showEmail ?? false,
    };
}

function blankToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
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
    const uploadBanner = useUploadVendorBanner();
    const deleteBanner = useDeleteVendorBanner();
    const [values, setValues] = useState(() => initialValues(profile, defaultType));
    const [logo, setLogo] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [banner, setBanner] = useState<File | null>(null);
    const [removeBanner, setRemoveBanner] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState<string | null>(null);

    const setField = useCallback((field: VendorProfileTextField, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
    }, []);

    // A tap adds the tag, or removes it when already picked. Past the limit a new tag is ignored.
    const toggleServiceTag = useCallback((tag: VendorServiceTag) => {
        setValues((current) => {
            if (current.serviceTags.includes(tag)) return { ...current, serviceTags: current.serviceTags.filter((picked) => picked !== tag) };
            if (current.serviceTags.length >= VENDOR_SERVICE_TAGS_MAX) return current;
            return { ...current, serviceTags: [...current.serviceTags, tag] };
        });
    }, []);

    const setShowPhone = useCallback((showPhone: boolean) => setValues((current) => ({ ...current, showPhone })), []);
    const setShowEmail = useCallback((showEmail: boolean) => setValues((current) => ({ ...current, showEmail })), []);

    const handleSubmit = useCallback(
        async (event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            const businessName = values.businessName.trim();
            const instagram = blankToNull(values.instagram);
            const website = blankToNull(values.website);
            const contactPhone = blankToNull(values.contactPhone);
            const contactEmail = blankToNull(values.contactEmail);

            const errors: FieldErrors = {};
            if (!businessName) errors.businessName = t('errors.businessNameRequired');
            else if (businessName.length > VENDOR_BUSINESS_NAME_MAX)
                errors.businessName = t('errors.businessNameTooLong', { max: VENDOR_BUSINESS_NAME_MAX });
            if (instagram && !instagramHandle(instagram)) errors.instagram = t('errors.instagramInvalid');
            if (website && !isValidVendorWebsite(website)) errors.website = t('errors.websiteInvalid');
            if (contactPhone && !isValidVendorPhone(contactPhone)) errors.contactPhone = t('errors.phoneInvalid');
            if (contactEmail && !isValidVendorEmail(contactEmail)) errors.contactEmail = t('errors.emailInvalid');
            setFieldErrors(errors);
            setError(null);
            if (Object.keys(errors).length > 0) return;

            const request: VendorProfileRequestDto = {
                businessName,
                vendorType: values.vendorType,
                description: blankToNull(values.description),
                serviceTags: values.serviceTags,
                instagram: instagram ? instagramHandle(instagram) : null,
                website,
                contactPhone,
                contactEmail,
                showPhone: values.showPhone,
                showEmail: values.showEmail,
            };

            try {
                await save.mutateAsync(request);
                if (logo) await uploadLogo.mutateAsync(logo);
                else if (removeLogo) await deleteLogo.mutateAsync();
                if (banner) await uploadBanner.mutateAsync(banner);
                else if (removeBanner) await deleteBanner.mutateAsync();
                onSaved();
            } catch (submitError) {
                setError(toErrorMessage(submitError));
            }
        },
        [banner, deleteBanner, deleteLogo, logo, onSaved, removeBanner, removeLogo, save, t, toErrorMessage, uploadBanner, uploadLogo, values],
    );

    return {
        values,
        setField,
        toggleServiceTag,
        setShowPhone,
        setShowEmail,
        logo,
        setLogo,
        removeLogo,
        setRemoveLogo,
        banner,
        setBanner,
        removeBanner,
        setRemoveBanner,
        fieldErrors,
        error,
        isSaving: save.isPending || uploadLogo.isPending || deleteLogo.isPending || uploadBanner.isPending || deleteBanner.isPending,
        handleSubmit,
    };
}
