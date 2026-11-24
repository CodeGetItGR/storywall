'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { IconType } from 'react-icons';
import { FaCommentSms, FaEnvelope, FaFacebook, FaInstagram, FaPhone, FaTiktok } from 'react-icons/fa6';

import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { CONTACT_LINK_KEYS, type ContactFields, type ContactLinkKey } from '@/lib/invitation/contactLinks';
import { cn } from '@/lib/utils';

// Phone, text message and email are typed as they are; the social ones are links.
const FIELD_TYPES: Record<ContactLinkKey, { type: 'tel' | 'email' | 'text'; isLink: boolean }> = {
    phone: { type: 'tel', isLink: false },
    sms: { type: 'tel', isLink: false },
    email: { type: 'email', isLink: false },
    facebook: { type: 'text', isLink: true },
    instagram: { type: 'text', isLink: true },
    tiktok: { type: 'text', isLink: true },
};

// Each brand in its own colour. TikTok's is black or white, and white shows on the dark sheet.
const FIELD_ICONS: Record<ContactLinkKey, { Icon: IconType; color: string }> = {
    phone: { Icon: FaPhone, color: 'text-(--smd-editor-muted)' },
    sms: { Icon: FaCommentSms, color: 'text-(--smd-editor-muted)' },
    email: { Icon: FaEnvelope, color: 'text-(--smd-editor-muted)' },
    facebook: { Icon: FaFacebook, color: 'text-[#1877F2]' },
    instagram: { Icon: FaInstagram, color: 'text-[#E4405F]' },
    tiktok: { Icon: FaTiktok, color: 'text-(--smd-editor-strong)' },
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

    const { Icon, color } = FIELD_ICONS[linkKey];

    return (
        <SettingsTextField
            label={t(linkKey)}
            icon={<Icon aria-hidden="true" className={cn('h-4 w-4 shrink-0', color)} />}
            value={value}
            onSave={save}
            type={type}
            isLink={isLink}
            maxLength={isLink ? 5000 : 300}
        />
    );
}
