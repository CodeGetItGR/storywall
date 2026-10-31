'use client';

import { Globe, Mail, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { InstagramIcon } from '@/components/vendors/InstagramIcon';
import type { VendorRowDto } from '@/lib/api/types';
import type { VendorCardAction as Action } from '@/lib/vendors';

const LABELS = {
    instagram: { label: 'list.instagram', of: 'list.instagramOf' },
    website: { label: 'list.website', of: 'list.websiteOf' },
    call: { label: 'list.call', of: 'list.callOf' },
    email: { label: 'list.email', of: 'list.emailOf' },
} as const;

// One button on a vendor card. Web links open in a new tab; a call or an email hands over to the phone.
// Every tap counts as a visit to the vendor.
export function VendorCardAction({
    action,
    vendor,
    onOpenAction,
}: {
    action: Action;
    vendor: VendorRowDto;
    onOpenAction: (vendor: VendorRowDto) => void;
}) {
    const t = useTranslations('Vendors');
    const handleClick = useCallback(() => onOpenAction(vendor), [onOpenAction, vendor]);
    const web = action.kind === 'instagram' || action.kind === 'website';
    const labels = LABELS[action.kind];

    return (
        <a
            href={action.href}
            target={web ? '_blank' : undefined}
            rel={web ? 'noopener noreferrer nofollow' : undefined}
            onClick={handleClick}
            aria-label={t(labels.of, { name: vendor.businessName ?? '' })}
            className={buttonVariants({
                variant: 'ghost',
                className: 'h-9 gap-1.5 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink hover:bg-surface-muted/70',
            })}
        >
            {action.kind === 'instagram' && <InstagramIcon className="size-4" />}
            {action.kind === 'website' && <Globe aria-hidden="true" />}
            {action.kind === 'call' && <Phone aria-hidden="true" />}
            {action.kind === 'email' && <Mail aria-hidden="true" />}
            {t(labels.label)}
        </a>
    );
}
