'use client';

import { useCallback } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeConvention } from '@/lib/api/types';

export function useLocalizedAppEventTypeCopy() {
    const { data: appConfig } = useAppConfig();
    const localizedText = useLocalizedText();

    return useCallback(
        (eventTypeKey: EventTypeConvention) => {
            const translation = appConfig?.translations.eventTypes[eventTypeKey];

            return {
                name: localizedText(translation?.name, eventTypeKey),
                tagline: localizedText(translation?.tagline),
                voice: translation?.voice,
            };
        },
        [appConfig?.translations.eventTypes, localizedText]
    );
}
