import type { EventDetailResponseDto, EventMemberResponseDto, EventRequestDto, EventTypeConvention, PlanTierResponseDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAVE_MY_DATE_MODULE_KEY } from '@/lib/saveMyDateRelease';

// What the invitation already says about its event, for the event made from it. Null where it says
// nothing usable, so the host is asked only for that.
export type InvitationEventDetails = {
    title: string | null;
    // A datetime-local value ("2027-08-29T19:30") in the host's time zone.
    startAt: string | null;
    locationName: string | null;
    locationAddress: string | null;
    mapsUrl: string | null;
};

// The backend's default limits (AppLimitsConfigDto): longer text is cut, not refused.
const TITLE_MAX = 255;
const LOCATION_NAME_MAX = 255;
const LOCATION_ADDRESS_MAX = 500;

// One line: the invitation's line breaks and runs of spaces become single spaces.
function oneLine(value: string | undefined, max: number): string | null {
    const line = (value ?? '').replace(/\s+/g, ' ').trim();
    return line ? line.slice(0, max).trim() : null;
}

function visibleSection<T extends InvitationDocument['sections'][number]['type']>(document: InvitationDocument, type: T) {
    return document.sections.find(
        (section): section is Extract<InvitationDocument['sections'][number], { type: T }> => section.type === type && section.visible,
    );
}

// The names at the top of the invitation ("Άγγελος & Αλεξάνδρα", "Αλέξανδρος"), else the couple's names.
export function invitationTitle(document: InvitationDocument): string | null {
    const top = visibleSection(document, 'top');
    const heading = top?.elements.flatMap((element) => (element.kind === 'text' ? [element.text] : [])).join(' ');
    const fromTop = oneLine(heading, TITLE_MAX);
    if (fromTop) return fromTop;
    const couple = visibleSection(document, 'coupleNames');
    const names = [couple?.data.partnerAName, couple?.data.partnerBName].map((name) => oneLine(name, TITLE_MAX)).filter(Boolean);
    return names.length > 0 ? oneLine(names.join(' & '), TITLE_MAX) : null;
}

// The invitation's date when it is still ahead: an event can't start in the past.
export function invitationStart(document: InvitationDocument, now: Date): string | null {
    const iso = visibleSection(document, 'date')?.data.iso;
    if (!iso) return null;
    const start = new Date(iso);
    return Number.isNaN(start.getTime()) || start.getTime() <= now.getTime() ? null : iso;
}

// A map link that points somewhere: themes ship with the bare maps home page as a placeholder.
function placeLink(value: string | undefined): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.pathname.length > 1 || url.search ? value : null;
    } catch {
        return null;
    }
}

// The ceremony, else the reception.
function invitationPlace(document: InvitationDocument): Pick<InvitationEventDetails, 'locationName' | 'locationAddress' | 'mapsUrl'> {
    const locations = visibleSection(document, 'locations')?.data;
    const ceremony = oneLine(locations?.ceremony, LOCATION_NAME_MAX);
    if (ceremony) {
        return {
            locationName: ceremony,
            locationAddress: oneLine(locations?.ceremonyAddress, LOCATION_ADDRESS_MAX),
            mapsUrl: placeLink(locations?.ceremonyMap),
        };
    }
    return {
        locationName: oneLine(locations?.reception, LOCATION_NAME_MAX),
        locationAddress: oneLine(locations?.receptionAddress, LOCATION_ADDRESS_MAX),
        mapsUrl: placeLink(locations?.receptionMap),
    };
}

export function invitationEventDetails(document: InvitationDocument, now: Date = new Date()): InvitationEventDetails {
    return { title: invitationTitle(document), startAt: invitationStart(document, now), ...invitationPlace(document) };
}

// The plans that let the event publish its invitation.
export function plansWithInvitation(plans: PlanTierResponseDto[]): PlanTierResponseDto[] {
    return plans.filter((plan) => plan.moduleKeys.includes(SAVE_MY_DATE_MODULE_KEY));
}

// Events the host may put the invitation on: hosted, of the theme's type, not deleted and without an
// invitation of their own. Soonest first.
export function eventsForInvitation({
    memberships,
    events,
    eventType,
    eventsWithInvitation,
}: {
    memberships: EventMemberResponseDto[];
    events: EventDetailResponseDto[];
    eventType: string;
    eventsWithInvitation: ReadonlySet<string>;
}): EventDetailResponseDto[] {
    const hosted = new Set(memberships.filter((member) => member.role === 'HOST' && !member.deletedAt).map((member) => member.eventId));
    return events
        .filter((event) => hosted.has(event.id) && event.eventType === eventType && !event.deletedAt && !eventsWithInvitation.has(event.id))
        .sort((left, right) => left.schedule.startAt.localeCompare(right.schedule.startAt));
}

// The new event's request: the invitation's details, the host's answers where it had none, the plan.
export function invitationEventRequest({
    details,
    title,
    startAt,
    eventType,
    planTierCode,
    coverageOptionId,
    timezone,
    initialSessionTitle,
}: {
    details: InvitationEventDetails;
    title: string;
    startAt: string;
    eventType: EventTypeConvention;
    planTierCode: string;
    coverageOptionId: string;
    timezone: string;
    initialSessionTitle?: string;
}): EventRequestDto {
    return {
        title: title.trim(),
        eventType,
        visibility: 'PRIVATE',
        startAt: new Date(startAt).toISOString(),
        timezone,
        locationName: details.locationName ?? undefined,
        locationAddress: details.locationAddress ?? undefined,
        mapsUrl: details.mapsUrl ?? undefined,
        brandingSettings: {},
        initialSessionTitle,
        planTierCode,
        coverageOptionId,
    };
}
