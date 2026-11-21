'use client';

import { useHelpProgress } from '@/hooks/useHelpProgress';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { eventCapabilities } from '@/lib/eventCapabilities';
import { journeyStepsLeft } from '@/lib/eventJourney';

/** The floating Overview button's badge: steps left in the event's current phase (null after the day). */
export function useJourneyStepsLeft(event: EventDetailResponseDto): number | null {
    const sessions = (event.sessions ?? []).filter((item) => !item.deletedAt);
    const progress = useHelpProgress({ eventId: event.id, title: event.title, schedule: event.schedule, location: event.location, sessions, showsDetails: eventCapabilities(event)?.showsDetailsSettings ?? true });
    return journeyStepsLeft(event, progress);
}
