'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { VendorListRow } from '@/components/vendors/list/VendorListRow';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import { useVendorList } from '@/hooks/useVendorList';
import { routes } from '@/lib/routes';

export function VendorListScreen() {
    const t = useTranslations('Vendors');
    const { eventId } = useEventRouteContext();
    const { vendors, isLoading, openVendor } = useVendorList(eventId);

    return (
        <ModulePageShell maxWidth="2xl" title={t('list.title')} icon={Store} backLabel={t('list.back')} backHref={routes.events.feed(eventId)}>
            {/* List */}
            {isLoading ? (
                <VendorRowsSkeleton />
            ) : vendors.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('list.empty')}</p>
            ) : (
                <ul className="flex flex-col divide-y divide-border">
                    {vendors.map((vendor) => (
                        <VendorListRow key={vendor.id} vendor={vendor} onOpenAction={openVendor} />
                    ))}
                </ul>
            )}
        </ModulePageShell>
    );
}
