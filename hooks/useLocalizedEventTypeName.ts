'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export function useLocalizedEventTypeName() {
    const t = useTranslations('EventTypes');

    return useCallback(
        (eventType: Pick<PlatformEventTypeResponseDto, 'eventTypeKey' | 'name'>) => {
            return t.has(`${eventType.eventTypeKey}.name`) ? t(`${eventType.eventTypeKey}.name`) : eventType.name;
        },
        [t]
    );
}
