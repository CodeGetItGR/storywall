'use client';

import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { LockedPreview } from '@/components/vendors/me/LockedPreview';
import { ServiceRow } from '@/components/vendors/me/ServiceRow';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { formatMoney } from '@/lib/billing';
import { PRINT_SIZES_MAX } from '@/lib/printPicks';
import { SAMPLE_PRINT_SIZES } from '@/lib/vendors';

// Print prices as compact rows: the host's included prints, then the sizes. A row opens its edit sheet.
// Non-partners get a blurred sample list in place of the sizes.
export function ServicesSection({
    approved,
    sizes,
    canAdd,
    needsProfile,
    profileLoading,
    isLoading,
    loadFailed,
    error,
    includedRow,
    canApply,
    onAddAction,
    onEditAction,
    onBecomePartnerAction,
}: {
    approved: boolean;
    sizes: VendorServiceItemDto[];
    canAdd: boolean;
    needsProfile: boolean;
    profileLoading: boolean;
    isLoading: boolean;
    loadFailed: boolean;
    error: string | null;
    includedRow?: ReactNode;
    canApply: boolean;
    onAddAction: () => void;
    onEditAction: (item: VendorServiceItemDto) => void;
    onBecomePartnerAction: () => void;
}) {
    const t = useTranslations('Vendors.services');
    const tHints = useTranslations('Vendors.hints');
    const locale = useLocale();
    const showSizes = approved && !loadFailed && !isLoading && !needsProfile && sizes.length > 0;

    return (
        <VendorMeSection
            id="vendor-services-title"
            title={t('title')}
            hint={tHints('printPrices')}
            action={
                approved &&
                !needsProfile && (
                    <Button type="button" variant="outline" size="lg" onClick={onAddAction} disabled={!canAdd || profileLoading}>
                        <Plus aria-hidden="true" />
                        {t('add')}
                    </Button>
                )
            }
        >
            {/* Prices */}
            {(includedRow || showSizes) && (
                <ul className="divide-y divide-border">
                    {includedRow}
                    {showSizes && sizes.map((size) => <ServiceRow key={size.id} size={size} onEditAction={onEditAction} />)}
                </ul>
            )}

            {/* Sizes state */}
            {!approved ? (
                <LockedPreview label={t('lockedLabel')} canApply={canApply} onApplyAction={onBecomePartnerAction}>
                    <ul className="divide-y divide-border">
                        {SAMPLE_PRINT_SIZES.map((size) => (
                            <li key={size.label} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                                <span className="text-ink">{size.label}</span>
                                <span className="text-ink-muted tabular-nums">{formatMoney(locale, size.priceCents, 'EUR')}</span>
                            </li>
                        ))}
                    </ul>
                </LockedPreview>
            ) : loadFailed ? null : isLoading ? (
                <VendorRowsSkeleton rows={2} />
            ) : needsProfile ? (
                <p className="text-sm text-ink-muted">{t('profileFirst')}</p>
            ) : (
                sizes.length === 0 && <p className="text-sm text-ink-muted">{t('empty')}</p>
            )}
            {approved && !canAdd && <p className="text-xs text-ink-muted">{t('limit', { max: PRINT_SIZES_MAX })}</p>}

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </VendorMeSection>
    );
}
