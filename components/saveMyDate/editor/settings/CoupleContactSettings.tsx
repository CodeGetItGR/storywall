'use client';

import { useCallback } from 'react';

import { ContactLinkFields } from '@/components/saveMyDate/editor/settings/ContactLinkFields';
import { SectionStyleSettings } from '@/components/saveMyDate/editor/settings/SectionStyleSettings';
import { SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useCoupleContactSettings } from '@/hooks/useContactSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ContactFields, ContactLinkKey } from '@/lib/invitation/contactLinks';
import type { Partner } from '@/lib/invitation/sectionSettingsEdits';
import { CONTACT_STYLE_FIELDS } from '@/lib/invitation/sectionStyleFields';

// Both partners' links and their style (old couple contact panel).
export function CoupleContactSettings({ scope }: { scope: SettingsScope<SectionOf<'coupleContact'>> }) {
    const contact = useCoupleContactSettings(scope);

    return (
        <>
            {/* Partners */}
            {contact.partners.map((partner) => (
                <PartnerLinks key={partner.key} partner={partner.key} title={partner.title} fields={partner.fields} onSave={contact.save} />
            ))}

            {/* Style */}
            <SectionStyleSettings scope={scope} groups={CONTACT_STYLE_FIELDS} />
        </>
    );
}

type PartnerLinksProps = {
    partner: Partner;
    title: string;
    fields: ContactFields;
    onSave: (partner: Partner, key: ContactLinkKey, value: string) => void;
};

function PartnerLinks({ partner, title, fields, onSave }: PartnerLinksProps) {
    const save = useCallback((key: ContactLinkKey, value: string) => onSave(partner, key, value), [onSave, partner]);

    return (
        <SettingsGroup title={title}>
            <ContactLinkFields fields={fields} onSave={save} />
        </SettingsGroup>
    );
}
