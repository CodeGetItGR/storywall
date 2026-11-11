'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ContactLinkKey } from '@/lib/invitation/contactLinks';
import { type Partner, setContactLink, setPartnerContactLink } from '@/lib/invitation/sectionSettingsEdits';

export function useContactSettings({ section, edit }: SettingsScope<SectionOf<'contact'>>) {
    const save = useCallback((key: ContactLinkKey, value: string) => edit(setContactLink(section.id, key, value)), [edit, section.id]);
    return { save };
}

const PARTNERS: { key: Partner; fallback: 'bride' | 'groom' }[] = [
    { key: 'partnerA', fallback: 'bride' },
    { key: 'partnerB', fallback: 'groom' },
];

// Each partner's links, under the name the invitation gives them.
export function useCoupleContactSettings({ section, edit }: SettingsScope<SectionOf<'coupleContact'>>) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const save = useCallback(
        (partner: Partner, key: ContactLinkKey, value: string) => edit(setPartnerContactLink(section.id, partner, key, value)),
        [edit, section.id],
    );
    const partners = PARTNERS.map(({ key, fallback }) => ({
        key,
        title: section.data[key].name.trim() || t(fallback),
        fields: section.data[key],
    }));

    return { partners, save };
}
