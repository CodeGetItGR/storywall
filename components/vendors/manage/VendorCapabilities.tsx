'use client';

import { useTranslations } from 'next-intl';

import { VendorCapabilityRow } from '@/components/vendors/manage/VendorCapabilityRow';
import type { VendorCapabilityItem } from '@/hooks/useVendorCapabilities';

// V1 "What vendors can do": one row per type the plan allows, with its icon and line.
export function VendorCapabilities({ items }: { items: VendorCapabilityItem[] }) {
    const t = useTranslations('Vendors');
    if (items.length === 0) return null;

    return (
        <section aria-labelledby="vendor-can-title" className="flex flex-col gap-3">
            {/* Header */}
            <h2 id="vendor-can-title" className="text-[15px] font-bold text-ink">
                {t('manage.can.title')}
            </h2>

            {/* Rows */}
            <ul className="flex flex-col gap-3.5">
                {items.map((item) => (
                    <VendorCapabilityRow key={item.type} item={item} marker="soft" />
                ))}
            </ul>
        </section>
    );
}
