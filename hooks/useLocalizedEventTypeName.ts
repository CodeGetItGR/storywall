'use client';

import { useCallback } from 'react';

import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { PlatformEventTypeResponseDto } from '@/lib/api/types';

export function useLocalizedEventTypeName() {
    const localizedText = useLocalizedText();

    return useCallback(
        (eventType: Pick<PlatformEventTypeResponseDto, 'eventTypeKey' | 'name'>) => localizedText(eventType.name, eventType.eventTypeKey),
        [localizedText]
    );
}
