'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { PartnerBrandingDto, PartnerRole } from '@/lib/api/types';
import { partnerBrandingHref, partnerBrandingText } from '@/lib/feed/partnerBranding';

/**
 * What every partner card variant renders. A null href renders the card
 * without a link (the admin preview); a null image shows a neutral block.
 */
export type PartnerBrandingCardContent = {
    href: string | null;
    name: string;
    roleLabel: string | null;
    partnerLabel: string;
    tagline: string;
    services: string;
    logoUrl: string | null;
    coverUrl: string | null;
    newTabLabel: string;
    visitLabel: string;
};

/** The card's fixed labels. OTHER shows no role, since the card already says "Partner". */
export function usePartnerCardLabels() {
    const t = useTranslations('PartnerCard');

    return {
        roleLabel: (role: PartnerRole | null) => (role && role !== 'OTHER' ? t(`roles.${role}`) : null),
        partnerLabel: t('partner'),
        newTabLabel: t('newTab'),
        visitLabel: t('visit'),
    };
}

/** A live card's content in the UI language. */
export function usePartnerBrandingCard(branding: PartnerBrandingDto): PartnerBrandingCardContent {
    const labels = usePartnerCardLabels();
    const locale = useLocale();

    return {
        href: partnerBrandingHref(branding.linkUrl),
        name: branding.displayName,
        roleLabel: labels.roleLabel(branding.role),
        partnerLabel: labels.partnerLabel,
        tagline: partnerBrandingText(branding.tagline, locale),
        services: partnerBrandingText(branding.services, locale),
        logoUrl: branding.logoUrl,
        coverUrl: branding.coverUrl,
        newTabLabel: labels.newTabLabel,
        visitLabel: labels.visitLabel,
    };
}
