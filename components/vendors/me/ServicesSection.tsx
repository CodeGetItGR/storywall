'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { ServiceRow } from '@/components/vendors/me/ServiceRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { VendorServiceItemDto } from '@/lib/api/types';

// Print sizes as compact rows; a row opens the edit sheet. Non-partners get one line.
export function ServicesSection({
    approved,
    sizes,
    canAdd,
    isLoading,
    error,
    onAddAction,
    onEditAction,
}: {
    approved: boolean;
    sizes: VendorServiceItemDto[];
    canAdd: boolean;
    isLoading: boolean;
    error: string | null;
    onAddAction: () => void;
    onEditAction: (item: VendorServiceItemDto) => void;
}) {
    const t = useTranslations('Vendors.services');

    return (
        <section aria-labelledby="vendor-services-title" className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h2 id="vendor-services-title" className="text-sm font-semibold text-ink">
                    {t('title')}
                </h2>
                {approved && (
                    <Button type="button" variant="outline" size="lg" onClick={onAddAction} disabled={!canAdd}>
                        <Plus aria-hidden="true" />
                        {t('add')}
                    </Button>
                )}
            </div>

            {/* Sizes */}
            {!approved ? (
                <p className="text-sm text-ink-muted">{t('partnerOnly')}</p>
            ) : isLoading ? (
                <VendorRowsSkeleton rows={2} />
            ) : sizes.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('empty')}</p>
            ) : (
                <ul className="divide-y divide-border">
                    {sizes.map((size) => (
                        <ServiceRow key={size.id} size={size} onEditAction={onEditAction} />
                    ))}
                </ul>
            )}
            {approved && !canAdd && <p className="text-xs text-ink-muted">{t('limit')}</p>}

            {/* Error */}
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
        </section>
    );
}
