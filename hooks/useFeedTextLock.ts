'use client';

import { useMemo } from 'react';

import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedEventData } from '@/lib/feedEventDetails';
import { eventFieldLinks } from '@/lib/invitation/eventData';
import { dateOnlyEventData } from '@/lib/invitation/eventLinks';

// What feed edit mode's text editing locks (KAN-293): a Date section's words are the event's date, changed in the
// event's settings, where the lock's link goes. Nothing else on the feed follows the event through its texts.
export function useFeedTextLock(event: EventDetailResponseDto) {
    return useMemo(() => ({ event: dateOnlyEventData(feedEventData(event)), fieldLinks: eventFieldLinks(event.id) }), [event]);
}
