import type { EventDetailResponseDto } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';

// The editor's copy of what the public page gets as `event` (guestwall-be InvitationPublicationService): the same
// fields, from the event's own detail. `joinUrl` is the event's general guest link, when the host's side has it.
export function invitationEventDataFromDetail(event: EventDetailResponseDto, joinUrl: string | null = null): InvitationEventData {
    const has = (key: 'rsvp' | 'schedule' | 'posts') => isModuleAvailable(event.modules, key);
    const cover = event.coverMedia;
    return {
        eventType: event.eventType,
        title: event.title,
        timezone: event.schedule.timezone,
        startAt: event.schedule.startAt || null,
        rsvp: has('rsvp') ? { deadline: event.schedule.rsvpDeadline } : null,
        cover: cover && cover.mediaType === 'IMAGE' ? { mediaId: cover.id, width: cover.width, height: cover.height } : null,
        location: { name: event.location.name, address: event.location.address, mapsUrl: event.location.mapsUrl },
        sessions:
            has('schedule') && event.sessions
                ? event.sessions
                      .filter((session) => !session.deletedAt)
                      .map((session) => ({
                          id: session.id,
                          title: session.title,
                          description: session.description,
                          startAt: session.startAt,
                          locationName: session.locationName,
                          mapsUrl: session.mapsUrl,
                          displayOrder: session.displayOrder,
                          isMain: session.isMain,
                          isSecondary: session.isSecondary,
                      }))
                : null,
        joinUrl: has('posts') ? joinUrl : null,
    };
}

// The URLs the editor draws the event's photos with: the cover, from the same detail.
export function eventImageUrls(event: EventDetailResponseDto | undefined): Record<string, string> {
    const cover = event?.coverMedia;
    return cover?.mediaUrl ? { [cover.id]: cover.mediaUrl } : {};
}
