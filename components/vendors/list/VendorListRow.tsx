'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { vendorLinkHref } from '@/lib/vendors';

export function VendorListRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: (vendor: VendorRowDto) => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? '';
    const href = vendorLinkHref(vendor.link);
    const handleOpen = useCallback(() => onOpenAction(vendor), [onOpenAction, vendor]);
    const body = (
        <>
            {/* Logo */}
            <VendorLogo logoUrl={vendor.logoUrl} name={name} />

            {/* Name and type */}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                <span className="block text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</span>
            </span>

            {/* Link */}
            {href && <ExternalLink className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />}
        </>
    );

    return (
        <li>
            {href ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={handleOpen}
                    aria-label={t('list.open', { name })}
                    className="flex items-center gap-3 py-3 focus-ring"
                >
                    {body}
                </a>
            ) : (
                <div className="flex items-center gap-3 py-3">{body}</div>
            )}
        </li>
    );
}
