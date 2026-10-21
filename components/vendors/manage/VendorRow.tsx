'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';

export function VendorRow({ vendor, onOpenAction }: { vendor: VendorRowDto; onOpenAction: (vendorId: string) => void }) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? t('manage.noProfile');
    const handleOpen = useCallback(() => onOpenAction(vendor.id), [onOpenAction, vendor.id]);
    // An opted-out vendor is out of the list too, so both read as hidden.
    const isHidden = Boolean(vendor.hiddenByHost || vendor.optedOut);

    return (
        <li>
            <button type="button" onClick={handleOpen} className="flex w-full items-center gap-3 py-3 text-left focus-ring">
                {/* Logo */}
                <VendorLogo logoUrl={vendor.logoUrl} name={name} />

                {/* Name and type */}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                    <span className="block text-xs text-ink-muted">{t(`types.${vendor.vendorType}`)}</span>
                </span>

                {/* Hidden */}
                {isHidden && (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">
                        {t('manage.hidden')}
                    </span>
                )}
            </button>
        </li>
    );
}
