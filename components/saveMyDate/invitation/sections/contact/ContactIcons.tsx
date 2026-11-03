import type { ReactNode } from 'react';

import { type ContactFields, type ContactLinkKey, contactLinks } from '@/lib/invitation/contactLinks';
import type { InvitationLabels } from '@/lib/invitation/labels';

const LABEL_KEYS = {
    phone: 'contactPhone',
    sms: 'contactSms',
    email: 'contactEmail',
    facebook: 'contactFacebook',
    instagram: 'contactInstagram',
    tiktok: 'contactTiktok',
} as const satisfies Record<ContactLinkKey, keyof InvitationLabels>;

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinejoin: 'round' } as const;

const ICONS: Record<ContactLinkKey, ReactNode> = {
    phone: <path d="M6.5 3h3l1.5 4-2 2c1 2.5 3 4.5 5.5 5.5l2-2 4 1.5v3c0 1-1 2-2 2C9.5 19 4 13.5 4 6c0-1 1-3 2.5-3Z" {...stroke} />,
    sms: <path d="M4 5h16v11H9l-4 3.5V16H4V5Z" {...stroke} />,
    email: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth={1.7} />
            <path d="M4 6.5l8 6 8-6" {...stroke} strokeLinecap="round" />
        </>
    ),
    facebook: (
        <>
            <path d="M3 12c0-5 4-8.5 9-8.5S21 7 21 12s-4 8.5-9 8.5c-1 0-2-.1-2.9-.4L4 21l1.3-4C4 15.5 3 14 3 12Z" {...stroke} />
            <path d="M8 12.3l2.2 2.1L16 9" {...stroke} strokeLinecap="round" />
        </>
    ),
    instagram: (
        <>
            <path d="M4 8a2 2 0 0 1 2-2h1.3l.9-1.4h7.6L16.7 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" {...stroke} />
            <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth={1.7} />
        </>
    ),
    tiktok: (
        <>
            <path d="M14 4v10.6a3.4 3.4 0 1 1-2-3.1V4h2Z" {...stroke} />
            <path d="M14 4c.3 1.8 1.7 3.1 3.5 3.3" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
        </>
    ),
};

type ContactIconsProps = { fields: ContactFields; labels: InvitationLabels };

// Round icon links for the ways a guest can reach someone. Empty when none are filled in.
export function ContactIcons({ fields, labels }: ContactIconsProps) {
    return (
        <div className="contact-icons">
            {contactLinks(fields).map((link) => (
                <a
                    key={link.key}
                    className="contact-icon-link"
                    href={link.href}
                    target="_blank"
                    rel="noopener"
                    title={labels[LABEL_KEYS[link.key]]}
                    aria-label={labels[LABEL_KEYS[link.key]]}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        {ICONS[link.key]}
                    </svg>
                </a>
            ))}
        </div>
    );
}
