'use client';

import { Camera, ClipboardList, type LucideIcon, Music, Store, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { VendorCapabilityItem } from '@/hooks/useVendorCapabilities';
import type { PartnerRole } from '@/lib/api/types';

const ICONS: Partial<Record<PartnerRole, LucideIcon>> = {
    PLANNER: ClipboardList,
    PHOTOGRAPHER: Camera,
    VIDEOGRAPHER: Video,
    MUSIC: Music,
};

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
                    <CapabilityRow key={item.key} item={item} />
                ))}
            </ul>
        </section>
    );
}

function CapabilityRow({ item }: { item: VendorCapabilityItem }) {
    const Icon = ICONS[item.type] ?? Store;

    return (
        <li className="flex items-start gap-3">
            {/* Icon */}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-dark">
                <Icon className="size-[18px]" aria-hidden="true" />
            </span>

            {/* Type and line */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
                <span className="text-sm font-semibold text-ink">{item.title}</span>
                <span className="text-[13px] leading-snug text-ink-muted">{item.body}</span>
            </span>
        </li>
    );
}
