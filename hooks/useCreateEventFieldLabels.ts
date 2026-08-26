'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { EventTypeConvention } from '@/lib/api/types';
import { getCreateEventCatalogEntry } from '@/lib/createEventCatalog';

type CreateEventFieldLabels = {
    title: string;
    startAt: string;
};

export function useCreateEventFieldLabels(eventType: EventTypeConvention): CreateEventFieldLabels {
    const t = useTranslations('CreateEventPage');

    return useMemo(() => {
        const catalogEntry = getCreateEventCatalogEntry(eventType);
        const startAtLabelKey = catalogEntry?.startAtLabelKey ?? `fieldLabels.${eventType}.startAt`;

        return {
            title: t.has(`fieldLabels.${eventType}.title`) ? t(`fieldLabels.${eventType}.title`) : t('fields.title'),
            startAt: t.has(startAtLabelKey) ? t(startAtLabelKey) : t('fields.startAt'),
        };
    }, [eventType, t]);
}
