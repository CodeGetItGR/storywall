'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import type { RowAction } from '@/components/ui/RowActionsMenu';
import type { VendorRowDto } from '@/lib/api/types';

type Options = {
    vendor: VendorRowDto;
    isPatching: boolean;
    onOpenAction: (vendorId: string) => void;
    onToggleHiddenAction: (vendorId: string) => void;
    onRemoveAction: (vendorId: string) => void;
};

// Manage → Vendors: one row's name, hidden state and ⋯ menu items.
export function useVendorRowActions({ vendor, isPatching, onOpenAction, onToggleHiddenAction, onRemoveAction }: Options) {
    const t = useTranslations('Vendors');
    const tMembers = useTranslations('ManagePage.members');
    const name = vendor.businessName ?? t('manage.noProfile');
    // An opted-out vendor is out of the list too, so both read as hidden. Only the host's own hide can be undone,
    // so an opted-out vendor's menu has no Show/Hide (the sheet says why).
    const isHidden = Boolean(vendor.hiddenByHost || vendor.optedOut);
    const canToggle = !vendor.optedOut && !isPatching;
    const open = useCallback(() => onOpenAction(vendor.id), [onOpenAction, vendor.id]);
    const toggleHidden = useCallback(() => onToggleHiddenAction(vendor.id), [onToggleHiddenAction, vendor.id]);
    const remove = useCallback(() => onRemoveAction(vendor.id), [onRemoveAction, vendor.id]);

    const actions = useMemo<RowAction[]>(() => {
        const toggle: RowAction = vendor.hiddenByHost
            ? { key: 'show', label: t('manage.show'), icon: Eye, onSelect: toggleHidden }
            : { key: 'hide', label: t('manage.hide'), icon: EyeOff, onSelect: toggleHidden };
        const removeAction: RowAction = { key: 'remove', label: t('manage.remove'), icon: Trash2, tone: 'danger', onSelect: remove };
        return canToggle ? [toggle, removeAction] : [removeAction];
    }, [canToggle, remove, t, toggleHidden, vendor.hiddenByHost]);

    return { name, isHidden, open, actions, moreLabel: tMembers('moreFor', { name }) };
}
