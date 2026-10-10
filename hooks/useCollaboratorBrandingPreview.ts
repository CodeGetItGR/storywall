'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useState } from 'react';

import { type PartnerBrandingCardContent, usePartnerCardLabels } from '@/hooks/usePartnerBrandingCard';
import type { Locale } from '@/i18n/config';
import { brandingRequestFromCollaborator, brandingRequestFromFormData } from '@/lib/adminPartnerBranding';
import type { CollaboratorResponseDto } from '@/lib/api/types';

/**
 * The feed card as the admin types: reads the form on every change and shows
 * the chosen language. It has no link, so it never counts a tap.
 */
export function useCollaboratorBrandingPreview(collaborator: CollaboratorResponseDto) {
    const t = useTranslations('AdminPage.collaborations.feedCard.preview.placeholders');
    const labels = usePartnerCardLabels();
    const [locale, setLocale] = useState<Locale>(useLocale() === 'el' ? 'el' : 'en');
    const [values, setValues] = useState(() => brandingRequestFromCollaborator(collaborator));

    const handleFormChange = useCallback((event: FormEvent<HTMLFormElement>) => {
        setValues(brandingRequestFromFormData(new FormData(event.currentTarget)));
    }, []);

    const tagline = locale === 'el' ? values.taglineEl : values.taglineEn;
    const services = locale === 'el' ? values.servicesEl : values.servicesEn;

    const content: PartnerBrandingCardContent = {
        href: null,
        name: values.displayName ?? t('name'),
        roleLabel: labels.roleLabel(values.role),
        partnerLabel: labels.partnerLabel,
        tagline: tagline ?? t('tagline'),
        services: services ?? t('services'),
        logoUrl: collaborator.brandingLogoUrl,
        coverUrl: collaborator.brandingCoverUrl,
        newTabLabel: labels.newTabLabel,
        visitLabel: labels.visitLabel,
    };

    return { content, locale, setLocale, handleFormChange };
}
