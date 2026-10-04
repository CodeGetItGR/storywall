'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';

type CreateEventFieldLabels = {
    title: string;
    startAt: string;
    locationName: string;
};

export function useCreateEventFieldLabels(eventType: EventTypeConvention): CreateEventFieldLabels {
    const t = useTranslations('CreateEventPage');

    return useMemo(() => {
        const catalogEntry = getCreateEventCatalogEntry(eventType);
        const startAtLabelKey = catalogEntry?.startAtLabelKey ?? `fieldLabels.${eventType}.startAt`;
        const typeLabel = (field: string, fallbackKey: string) =>
            t.has(`fieldLabels.${eventType}.${field}`) ? t(`fieldLabels.${eventType}.${field}`) : t(fallbackKey);

        return {
            title: typeLabel('title', 'fields.title'),
            startAt: t.has(startAtLabelKey) ? t(startAtLabelKey) : t('fields.startAt'),
            locationName: typeLabel('locationName', 'fields.locationName'),
        };
    }, [eventType, t]);
}
