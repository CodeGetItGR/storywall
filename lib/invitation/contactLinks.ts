// The icon links of a contact person (old wedartContactLinksHtml), shared by
// the contact and couple contact sections. Only filled-in ones are shown.

export const CONTACT_LINK_KEYS = ['phone', 'sms', 'email', 'facebook', 'instagram', 'tiktok'] as const;

export type ContactLinkKey = (typeof CONTACT_LINK_KEYS)[number];

export type ContactFields = Record<ContactLinkKey, string>;

export type ContactLink = { key: ContactLinkKey; href: string };

const digits = (value: string) => value.trim().replace(/[^\d+]/g, '');

function webLink(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
}

function contactHref(key: ContactLinkKey, value: string): string {
    if (!value.trim()) return '';
    switch (key) {
        case 'phone':
            return `tel:${digits(value)}`;
        case 'sms':
            return `sms:${digits(value)}`;
        case 'email':
            return `mailto:${value.trim()}`;
        default:
            return webLink(value);
    }
}

export function contactLinks(fields: ContactFields): ContactLink[] {
    return CONTACT_LINK_KEYS.map((key) => ({ key, href: contactHref(key, fields[key]) })).filter((link) => link.href);
}
