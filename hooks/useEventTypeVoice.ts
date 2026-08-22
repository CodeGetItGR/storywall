'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { EventTypeConvention, EventTypeVoicePack } from '@/lib/api/types';

// Resolves the ten-string voice pack for one event type, falling back to a
// neutral FE string only if the backend hasn't shipped that type's copy yet.
// See docs/integration guides/event-type-voice-pack-fe-integration.md.
export function useEventTypeVoice(eventTypeKey: EventTypeConvention | null | undefined) {
    const { data: appConfig } = useAppConfig();
    const localizedText = useLocalizedText();
    const tFallback = useTranslations('EventVoiceFallback');

    const voice = appConfig?.eventTypes.find((type) => type.eventTypeKey === eventTypeKey)?.voice;

    return useMemo(() => {
        function resolve(key: keyof EventTypeVoicePack) {
            const value = voice?.[key];
            return value ? localizedText(value) : tFallback(key);
        }

        return {
            titlePlaceholder: resolve('titlePlaceholder'),
            locationPlaceholder: resolve('locationPlaceholder'),
            joinSubtitle: resolve('joinSubtitle'),
            joinDisclaimer: resolve('joinDisclaimer'),
            inviteHeadline: resolve('inviteHeadline'),
            rsvpMessageLabel: resolve('rsvpMessageLabel'),
            rsvpAttendingConfirmation: resolve('rsvpAttendingConfirmation'),
            toolsSubtitle: resolve('toolsSubtitle'),
            toolsScheduleDescription: resolve('toolsScheduleDescription'),
            toolsPlaylistDescription: resolve('toolsPlaylistDescription'),
        };
    }, [voice, localizedText, tFallback]);
}
