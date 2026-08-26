'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { EventTypeConvention } from '@/lib/api/types';

type CreateEventFieldLabels = {
    title: string;
    startAt: string;
};

export function useCreateEventFieldLabels(eventType: EventTypeConvention): CreateEventFieldLabels {
    const t = useTranslations('CreateEventPage');

    return useMemo(
        () => ({
            title: t.has(`fieldLabels.${eventType}.title`) ? t(`fieldLabels.${eventType}.title`) : t('fields.title'),
            startAt: t.has(`fieldLabels.${eventType}.startAt`) ? t(`fieldLabels.${eventType}.startAt`) : t('fields.startAt'),
        }),
        [eventType, t]
    );
}
