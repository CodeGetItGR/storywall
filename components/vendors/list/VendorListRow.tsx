'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { InstagramIcon } from '@/components/vendors/InstagramIcon';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { vendorLinkHref, vendorLinkKind } from '@/lib/vendors';

// The row itself is not a link: only the button, which says where it goes, leaves the app.
export function VendorListRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: (vendor: VendorRowDto) => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? '';
    const href = vendorLinkHref(vendor.link);
    const kind = vendorLinkKind(vendor.link);
    const handleOpen = useCallback(() => onOpenAction(vendor), [onOpenAction, vendor]);

    return (
        <li className="flex items-center gap-3 py-3">
            {/* Logo */}
            <VendorLogo logoUrl={vendor.logoUrl} name={name} className="size-12" />

            {/* Name and type */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>
            </div>

            {/* Link */}
            {href && kind && (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={handleOpen}
                    aria-label={t(kind === 'instagram' ? 'list.instagramOf' : 'list.websiteOf', { name })}
                    className={buttonVariants({
                        variant: 'ghost',
                        className: 'h-10 gap-1.5 rounded-full bg-surface-muted px-3.5 font-semibold text-ink hover:bg-surface-muted/70',
                    })}
                >
                    {kind === 'instagram' ? <InstagramIcon className="size-4" /> : <Globe aria-hidden="true" />}
                    {t(kind === 'instagram' ? 'list.instagram' : 'list.website')}
                </a>
            )}
        </li>
    );
}
