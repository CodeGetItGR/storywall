import type { EventDetailResponseDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';
import { invitationEventDataFromDetail } from '@/lib/invitation/eventData';
import { type InvitationEventData, localDateTime, resolveEventDates } from '@/lib/invitation/eventLinks';
import { eventPlaces } from '@/lib/invitation/eventPlaces';
import type { RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// The feed's Date, Countdown and Places read the event, never what the host typed (KAN-293).
export type FeedEventDetails = NonNullable<RenderContext['eventDetails']>;

export function feedEventData(event: EventDetailResponseDto): InvitationEventData {
    return invitationEventDataFromDetail(event);
}

// The event's date as the venue's clock shows it ("2027-07-12T18:30"), and its places.
export function feedEventDetails(event: InvitationEventData): FeedEventDetails {
    return { iso: event.startAt ? localDateTime(event.startAt, event.timezone) : null, places: eventPlaces(event) };
}

// The layout with the event's date in its Date sections.
export function withEventDates(document: InvitationDocument, event: InvitationEventData): InvitationDocument {
    return resolveEventDates(document, event);
}

// The render context of a feed: the countdown counts to the event's date, and Date and Places read the event.
export function withEventDetails(ctx: RenderContext, details: FeedEventDetails): RenderContext {
    return { ...ctx, eventDetails: details, eventIso: details.iso ?? undefined };
}

// Whether the invitation shows its own Places section, so the cover leaves out its place buttons (KAN-293).
export function showsPlaces(middle: readonly InvitationSection[]): boolean {
    return middle.some((section) => section.type === 'locations');
}
