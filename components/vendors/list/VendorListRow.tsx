'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { VendorCardAction } from '@/components/vendors/list/VendorCardAction';
import { VendorBanner } from '@/components/vendors/VendorBanner';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { serviceTagsForType, vendorCardActions } from '@/lib/vendors';

// A vendor as a card: their banner (or a soft backdrop) on top, the logo overlapping it, then who they are, what
// they offer and how to reach them. The card itself is not a link: only the buttons, which say where they go.
export function VendorListRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: (vendor: VendorRowDto) => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? '';
    const tags = useMemo(() => serviceTagsForType(vendor.serviceTags, vendor.vendorType), [vendor.serviceTags, vendor.vendorType]);
    const actions = useMemo(() => vendorCardActions(vendor), [vendor]);

    return (
        <li className="flex flex-col overflow-hidden rounded-[1.75rem] bg-card shadow-xs ring-1 ring-ink/5">
            {/* Banner */}
            <VendorBanner
                bannerUrl={vendor.bannerUrl ?? null}
                alt={t('bannerAlt', { name })}
                sizes="(min-width: 640px) 336px, 100vw"
                className="aspect-[3/1] w-full"
            />

            <div className="flex flex-1 flex-col px-4 pb-4">
                {/* Logo */}
                <VendorLogo logoUrl={vendor.logoUrl} name={name} className="-mt-8 size-16 rounded-[1.1rem] shadow-md ring-4 ring-card" />

                {/* Name and type */}
                <div className="mt-2.5 min-w-0">
                    <p className="truncate text-base font-bold text-ink">{name}</p>
                    <p className="text-sm text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>
                </div>

                {/* Description */}
                {vendor.description && <p className="mt-2 line-clamp-2 text-sm leading-snug text-ink">{vendor.description}</p>}

                {/* Services */}
                {tags.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            <li key={tag} className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-ink">
                                {t(`serviceTags.${tag}`)}
                            </li>
                        ))}
                    </ul>
                )}

                {/* Links */}
                {actions.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {actions.map((action) => (
                            <VendorCardAction key={action.kind} action={action} vendor={vendor} onOpenAction={onOpenAction} />
                        ))}
                    </div>
                )}
            </div>
        </li>
    );
}
