'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';

export function VendorRow({
    vendor,
    isPatching,
    onOpenAction,
    onToggleHiddenAction,
    onRemoveAction,
}: {
    vendor: VendorRowDto;
    isPatching: boolean;
    onOpenAction: (vendorId: string) => void;
    onToggleHiddenAction: (vendorId: string) => void;
    onRemoveAction: (vendorId: string) => void;
}) {
    const t = useTranslations('Vendors');
    const name = vendor.businessName ?? t('manage.noProfile');
    const handleOpen = useCallback(() => onOpenAction(vendor.id), [onOpenAction, vendor.id]);
    const handleToggleHidden = useCallback(() => onToggleHiddenAction(vendor.id), [onToggleHiddenAction, vendor.id]);
    const handleRemove = useCallback(() => onRemoveAction(vendor.id), [onRemoveAction, vendor.id]);
    // An opted-out vendor is out of the list too, so both read as hidden.
    const isHidden = Boolean(vendor.hiddenByHost || vendor.optedOut);

    return (
        <li className="flex items-center gap-1">
            <button type="button" onClick={handleOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left focus-ring">
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

            {/* Actions */}
            <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="size-10 text-ink-muted"
                onClick={handleToggleHidden}
                disabled={isPatching || Boolean(vendor.optedOut)}
                aria-label={vendor.hiddenByHost ? t('manage.showNamed', { name }) : t('manage.hideNamed', { name })}
            >
                {vendor.hiddenByHost ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="size-10 text-destructive hover:text-destructive"
                onClick={handleRemove}
                aria-label={t('manage.removeNamed', { name })}
            >
                <Trash2 aria-hidden="true" />
            </Button>
        </li>
    );
}
