'use client';

import { useTranslations } from 'next-intl';

import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { useVendorRowActions } from '@/hooks/useVendorRowActions';
import type { VendorRowDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// V1: a soft row (round logo, name, type, a grey "Hidden"). Tapping it opens the vendor's sheet;
// the ⋯ menu holds Show/Hide in list and Remove.
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
    const row = useVendorRowActions({ vendor, isPatching, onOpenAction, onToggleHiddenAction, onRemoveAction });

    return (
        <li className="flex min-h-[68px] items-center gap-1">
            <button type="button" onClick={row.open} className="flex min-w-0 flex-1 items-center gap-3.5 rounded-xl py-1.5 text-left focus-ring">
                {/* Logo */}
                <VendorLogo logoUrl={vendor.logoUrl} name={row.name} className={cn('size-12 rounded-full', row.isHidden && 'opacity-55')} />

                {/* Name and type */}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('truncate text-[15px] font-semibold', row.isHidden ? 'text-ink-muted' : 'text-ink')}>{row.name}</span>
                    <span className="truncate text-[13px] text-ink-faint">{t(`types.${vendor.vendorType}`)}</span>
                </span>

                {/* Hidden */}
                {row.isHidden && <span className="shrink-0 text-xs font-semibold text-ink-faint">{t('manage.hidden')}</span>}
            </button>

            {/* Actions */}
            <RowActionsMenu label={row.moreLabel} items={row.actions} />
        </li>
    );
}
