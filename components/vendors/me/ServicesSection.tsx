'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ServiceRow } from '@/components/vendors/me/ServiceRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { VendorServiceItemDto } from '@/lib/api/types';
import { PRINT_SIZES_MAX } from '@/lib/printPicks';

// Print prices as compact rows: the host's included prints, then the sizes. A row opens its edit sheet. Non-partners get one line for the sizes.
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
    onAddAction,
    onEditAction,
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
    onAddAction: () => void;
    onEditAction: (item: VendorServiceItemDto) => void;
}) {
    const t = useTranslations('Vendors.services');
    const showSizes = approved && !loadFailed && !isLoading && !needsProfile && sizes.length > 0;

    return (
        <section aria-labelledby="vendor-services-title" className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="vendor-services-title" className="text-sm font-semibold text-ink">
                    {t('title')}
                </h3>
                {approved && !needsProfile && (
                    <Button type="button" variant="outline" size="lg" onClick={onAddAction} disabled={!canAdd || profileLoading}>
                        <Plus aria-hidden="true" />
                        {t('add')}
                    </Button>
                )}
            </div>

            {/* Prices */}
            {(includedRow || showSizes) && (
                <ul className="divide-y divide-border">
                    {includedRow}
                    {showSizes && sizes.map((size) => <ServiceRow key={size.id} size={size} onEditAction={onEditAction} />)}
                </ul>
            )}

            {/* Sizes state */}
            {!approved ? (
                <p className="text-sm text-ink-muted">{t('partnerOnly')}</p>
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
        </section>
    );
}
