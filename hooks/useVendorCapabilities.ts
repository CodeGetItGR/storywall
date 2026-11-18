'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useAllowedVendorTypes } from '@/hooks/useAllowedVendorTypes';
import type { PartnerRole } from '@/lib/api/types';
import { vendorCapabilityTypes } from '@/lib/vendors';

export type VendorCapabilityItem = { type: PartnerRole; title: string; body: string };

// Manage → Vendors, "What vendors can do": a row per type this event's plan allows, with its name and line.
export function useVendorCapabilities(eventId: string): VendorCapabilityItem[] {
    const t = useTranslations('Vendors');
    const allowed = useAllowedVendorTypes(eventId);

    return useMemo(
        () =>
            vendorCapabilityTypes(allowed).map((type) =>
                type === 'OTHER'
                    ? { type, title: t('manage.can.others'), body: t('manage.can.listed') }
                    : { type, title: t(`types.${type}`), body: t(`manage.can.${type}`) },
            ),
        [allowed, t],
    );
}
