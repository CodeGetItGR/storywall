'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { CONTACT_LINK_KEYS, type ContactFields, type ContactLinkKey } from '@/lib/invitation/contactLinks';

// Phone, text message and email are typed as they are; the social ones are links.
const FIELD_TYPES: Record<ContactLinkKey, { type: 'tel' | 'email' | 'text'; isLink: boolean }> = {
    phone: { type: 'tel', isLink: false },
    sms: { type: 'tel', isLink: false },
    email: { type: 'email', isLink: false },
    facebook: { type: 'text', isLink: true },
    instagram: { type: 'text', isLink: true },
    tiktok: { type: 'text', isLink: true },
};

type ContactLinkFieldsProps = {
    fields: ContactFields;
    onSave: (key: ContactLinkKey, value: string) => void;
};

// One contact person's six ways to be reached.
export function ContactLinkFields({ fields, onSave }: ContactLinkFieldsProps) {
    return CONTACT_LINK_KEYS.map((key) => <ContactLinkField key={key} linkKey={key} value={fields[key]} onSave={onSave} />);
}

function ContactLinkField({ linkKey, value, onSave }: { linkKey: ContactLinkKey; value: string; onSave: ContactLinkFieldsProps['onSave'] }) {
    const t = useTranslations('InvitationEditor.sectionSettings.contactLinks');
    const save = useCallback((next: string) => onSave(linkKey, next), [linkKey, onSave]);
    const { type, isLink } = FIELD_TYPES[linkKey];

    return <SettingsTextField label={t(linkKey)} value={value} onSave={save} type={type} isLink={isLink} maxLength={isLink ? 5000 : 300} />;
}
