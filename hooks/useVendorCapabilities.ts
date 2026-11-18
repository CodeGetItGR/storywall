'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { PartnerRole } from '@/lib/api/types';
import { allowedVendorTypes, vendorCapabilityRows } from '@/lib/vendors';
import { useActiveEvent } from '@/providers/EventProvider';

export type VendorCapabilityItem = { key: string; type: PartnerRole; title: string; body: string };

// Manage → Vendors, "What vendors can do": a row per type this event's plan allows, with its name and line.
// The types without tools of their own share one row, titled with their names joined the locale's way.
export function useVendorCapabilities(eventId: string): VendorCapabilityItem[] {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const activeEvent = useActiveEvent();
    const modules = activeEvent?.id === eventId ? activeEvent.modules : undefined;

    return useMemo(() => {
        // en-GB joins without the serial comma, as the approved copy reads ("Venue, Decoration and Catering").
        const list = new Intl.ListFormat(locale === 'en' ? 'en-GB' : locale, { type: 'conjunction' });
        return vendorCapabilityRows(allowedVendorTypes(modules)).map((row) =>
            row.kind === 'tools'
                ? { key: row.type, type: row.type, title: t(`types.${row.type}`), body: t(`manage.can.${row.type}`) }
                : {
                      key: 'listed',
                      type: row.types[0],
                      title: list.format(row.types.map((type) => (type === 'OTHER' ? t('manage.can.others') : t(`types.${type}`)))),
                      body: t('manage.can.listed'),
                  },
        );
    }, [locale, modules, t]);
}
