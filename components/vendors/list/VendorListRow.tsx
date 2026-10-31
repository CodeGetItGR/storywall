'use client';

import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { InstagramIcon } from '@/components/vendors/InstagramIcon';
import { VendorBanner } from '@/components/vendors/VendorBanner';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { vendorLinkHref, vendorLinkKind } from '@/lib/vendors';

// A vendor as a card: their banner (or a soft backdrop) on top, the logo overlapping it, then name, type and link.
// The card itself is not a link: only the button, which says where it goes, leaves the app.
export function VendorListRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: (vendor: VendorRowDto) => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? '';
    const href = vendorLinkHref(vendor.link);
    const kind = vendorLinkKind(vendor.link);
    const handleOpen = useCallback(() => onOpenAction(vendor), [onOpenAction, vendor]);

    return (
        <li className="overflow-hidden rounded-[1.75rem] bg-card shadow-xs ring-1 ring-ink/5">
            {/* Banner */}
            <VendorBanner
                bannerUrl={vendor.bannerUrl ?? null}
                alt={t('bannerAlt', { name })}
                sizes="(min-width: 640px) 336px, 100vw"
                className="aspect-[3/1] w-full"
            />

            <div className="px-4 pb-4">
                {/* Logo */}
                <VendorLogo logoUrl={vendor.logoUrl} name={name} className="-mt-8 size-16 rounded-[1.1rem] bg-card shadow-md ring-4 ring-card" />

                {/* Name, type and link */}
                <div className="mt-2.5 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-ink">{name}</p>
                        <p className="text-sm text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>
                    </div>
                    {href && kind && (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            onClick={handleOpen}
                            aria-label={t(kind === 'instagram' ? 'list.instagramOf' : 'list.websiteOf', { name })}
                            className={buttonVariants({
                                variant: 'ghost',
                                className:
                                    'h-10 shrink-0 gap-1.5 rounded-full bg-surface-muted px-3.5 font-semibold text-ink hover:bg-surface-muted/70',
                            })}
                        >
                            {kind === 'instagram' ? <InstagramIcon className="size-4" /> : <Globe aria-hidden="true" />}
                            {t(kind === 'instagram' ? 'list.instagram' : 'list.website')}
                        </a>
                    )}
                </div>
            </div>
        </li>
    );
}
