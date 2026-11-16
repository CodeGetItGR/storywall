import { type Draft, produce } from 'immer';

import { applyDateLanguage, dayAndMonthWords } from '@/lib/invitation/dateDisplay';
import { type InvitationDocument, upgradeInvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { INVITATION_LABELS, invitationLanguage } from '@/lib/invitation/labels';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { type EventLink, linkSchema } from '@/lib/invitation/primitives';
import { type InvitationSection, LINKABLE_SECTION_TYPES, type SectionType } from '@/lib/invitation/sections';
import { textSectionId, type TextTarget } from '@/lib/invitation/textEditing';

// The invitation following its event (KAN-84; docs/superpowers/specs/2026-11-06-invitation-module-integration-design.md,
// "Following the event"). The names, the date, the RSVP deadline, the schedule and the places always show the event's
// values once the event has them: the host changes them on the event, never on the invitation. The cover follows the
// event until the host picks another photo. Nothing here ever writes to the event.

export type InvitationEventSession = {
    id: string;
    title: string;
    description: string | null;
    startAt: string | null;
    locationName: string | null;
    // Missing from a backend older than the session address.
    locationAddress?: string | null;
    mapsUrl: string | null;
    displayOrder: number;
    isMain: boolean;
    isSecondary: boolean;
};

export type InvitationEventCover = { mediaId: string; width: number | null; height: number | null };

// What the event tells its invitation. The public read endpoint returns it as `event`; the editor builds it from the
// event's detail (invitationEventDataFromDetail).
export type InvitationEventData = {
    eventType: string;
    title: string;
    timezone: string;
    startAt: string | null;
    // Null while the event's plan has no RSVP; then `deadline` is the reply-by date, if the host set one.
    rsvp: { deadline: string | null } | null;
    cover: InvitationEventCover | null;
    location: { name: string | null; address: string | null; mapsUrl: string | null };
    // Null while the event's plan has no schedule. Never holds deleted sessions.
    sessions: InvitationEventSession[] | null;
    // The event's general guest link, while the plan has the wall and the link is active.
    joinUrl: string | null;
};

// Where the host changes a locked value: the event's settings, its RSVP or its schedule.
export type EventFieldSource = 'settings' | 'rsvp' | 'schedule';

type Section = InvitationSection;
type SectionOf<T extends Section['type']> = Extract<Section, { type: T }>;
type PhotoFrame = Extract<InvitationElement, { kind: 'photoFrame' }>;

const FOLLOWING: EventLink = { source: 'event', enabled: true };

// The sections whose event values are locked. The Photo section only carries the cover, which the host may take over.
const LOCKED_SECTION_TYPES: ReadonlySet<SectionType> = new Set([
    'top', 'coupleNames', 'baby', 'date', 'rsvp', 'program', 'programIcons', 'locations',
]);

// Event types whose secondary session is the reception (lib/sessionLocations.ts).
const RECEPTION_EVENT_TYPES = new Set(['WEDDING', 'BAPTISM']);

// --- Event values, in the event's own time zone -------------------------------------------------------------------

// "2027-07-12T18:30": the instant as the venue's clock shows it.
export function localDateTime(instant: string, timezone: string): string | null {
    const date = new Date(instant);
    if (Number.isNaN(date.getTime())) return null;
    let parts: Intl.DateTimeFormatPart[];
    try {
        parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(date);
    } catch {
        return null;
    }
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

// "Άγγελος & Αλεξάνδρα" → ["Άγγελος", "Αλεξάνδρα"]; anything but exactly two names → null.
export function splitNames(title: string): [string, string] | null {
    const parts = title.split('&').map((part) => part.trim());
    return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
}

// The event's own order (displayOrder), as the event page and the backend list them; the time breaks a tie.
function sortedSessions(sessions: InvitationEventSession[]): InvitationEventSession[] {
    const start = (session: InvitationEventSession) => (session.startAt ? new Date(session.startAt).getTime() : Number.MAX_SAFE_INTEGER);
    return [...sessions].sort((a, b) => a.displayOrder - b.displayOrder || start(a) - start(b));
}

type Place = { name: string; address: string | null; mapsUrl: string | null };

// The ceremony's place from the event: the main session's, else the event's own. Null when it has none. The main
// session mirrors the event's place, so the event's address stands in for a backend that sends none.
function ceremonyPlace(event: InvitationEventData): Place | null {
    const main = (event.sessions ?? []).find((session) => session.isMain && session.locationName);
    if (main?.locationName) {
        return { name: main.locationName, address: main.locationAddress ?? event.location.address, mapsUrl: main.mapsUrl };
    }
    if (event.location.name) return { name: event.location.name, address: event.location.address, mapsUrl: event.location.mapsUrl };
    return null;
}

// The reception's place: the secondary session's, on event types that have one.
function receptionPlace(event: InvitationEventData): Place | null {
    if (!RECEPTION_EVENT_TYPES.has(event.eventType)) return null;
    const session = (event.sessions ?? []).find((item) => item.isSecondary && item.locationName);
    return session?.locationName ? { name: session.locationName, address: session.locationAddress ?? null, mapsUrl: session.mapsUrl } : null;
}

// A link the format accepts, else none.
function mapLink(value: string | null): string {
    return value && linkSchema.safeParse(value).success ? value : '';
}

// --- What follows, per section ------------------------------------------------------------------------------------

// The top's names: its title texts (the "&" between them is a paragraph). One or two of them, else none follow.
function topNameElements<T extends { elements: readonly InvitationElement[] }>(section: T): T['elements'][number][] {
    const titles = section.elements.filter((element) => element.kind === 'text' && element.role === 'title');
    return titles.length === 1 || titles.length === 2 ? titles : [];
}

// The frame the event's cover fills: the top's first photo frame.
function coverFrame<T extends { elements: readonly InvitationElement[] }>(section: T): PhotoFrame | undefined {
    return section.elements.find((element): element is PhotoFrame => element.kind === 'photoFrame');
}

const DATE_WORDS = ['iso', 'day', 'number', 'month', 'monthName', 'monthGenitive', 'monthNumber', 'time', 'yearLabel', 'yearShort', 'periodLabel'] as const;
const CEREMONY_FIELDS = ['ceremony', 'ceremonyAddress', 'ceremonyMap'] as const;
const RECEPTION_FIELDS = ['reception', 'receptionAddress', 'receptionMap'] as const;

// Whether the event has anything for this section to show. A section follows only then; until then the host may
// still type in it.
function eventFeeds(section: Section, event: InvitationEventData, hasTopFrame: boolean): boolean {
    switch (section.type) {
        case 'top':
            return topNameElements(section).length === 2 ? splitNames(event.title) !== null : topNameElements(section).length === 1;
        case 'coupleNames':
            return splitNames(event.title) !== null;
        case 'baby':
            return Boolean(event.title.trim());
        case 'date':
            return event.startAt !== null;
        case 'rsvp':
            return Boolean(event.rsvp?.deadline);
        case 'program':
        case 'programIcons':
            return Boolean(event.sessions?.length);
        case 'locations':
            return ceremonyPlace(event) !== null || receptionPlace(event) !== null;
        case 'photo':
            return !hasTopFrame;
        default:
            return false;
    }
}

// Whether the section shows event values the host can't change here.
function isLocked(section: Section, event: InvitationEventData): boolean {
    return LOCKED_SECTION_TYPES.has(section.type) && eventFeeds(section, event, false);
}

// --- Writing the event into the invitation ------------------------------------------------------------------------

// Keeps the list's text styles with the row at the same place when the rows are replaced, and drops the rest:
// a style for a row that no longer exists fails the format.
function carryRowStyles(section: Draft<SectionOf<'program'> | SectionOf<'programIcons'>>, oldIds: string[]) {
    const newIds = section.data.items.map((item) => item.id);
    const styles: typeof section.textStyles = {};
    for (const [path, style] of Object.entries(section.textStyles)) {
        const match = /^items\.([^.]+)\.(.+)$/.exec(path);
        if (!match) {
            styles[path] = style;
            continue;
        }
        const newId = newIds[oldIds.indexOf(match[1])];
        if (newId) styles[`items.${newId}.${match[2]}`] = style;
    }
    section.textStyles = styles;
}

function programTime(session: InvitationEventSession, timezone: string): string {
    return session.startAt ? (localDateTime(session.startAt, timezone)?.slice(11, 16) ?? '') : '';
}

function applyNames(section: Draft<SectionOf<'top'>>, title: string) {
    const names = topNameElements(section);
    const values = names.length === 2 ? splitNames(title) : [title.trim()];
    if (!values || !values[0]) return;
    names.forEach((element, index) => {
        if (element.kind === 'text') element.text = values[index];
    });
}

function applyCover(frame: Draft<PhotoFrame>, cover: InvitationEventCover) {
    if (frame.photo?.source === 'event' && frame.photo.mediaId === cover.mediaId) return;
    frame.photo = { source: 'event', mediaId: cover.mediaId };
    // The new photo's own size, so the frame crops it as it would an upload; unknown, it fills the frame.
    frame.imageWidth = cover.width ?? 0;
    frame.imageHeight = cover.height ?? 0;
    frame.imageX = 50;
    frame.imageY = 50;
}

type PlaceField = (typeof CEREMONY_FIELDS)[number] | (typeof RECEPTION_FIELDS)[number];

// The event's value for each detail of the places, or nothing where the event has none: the host's stays.
function placeValues(event: InvitationEventData): Partial<Record<PlaceField, string>> {
    const values: Partial<Record<PlaceField, string>> = {};
    const fill = (place: Place | null, [name, address, map]: readonly [PlaceField, PlaceField, PlaceField]) => {
        if (!place) return;
        values[name] = place.name;
        if (place.address?.trim()) values[address] = place.address.trim();
        const link = mapLink(place.mapsUrl);
        if (link) values[map] = link;
    };
    fill(ceremonyPlace(event), CEREMONY_FIELDS);
    fill(receptionPlace(event), RECEPTION_FIELDS);
    return values;
}

// Each detail of a place the event has a value for: its name, address or map link, each on its own.
function applyPlaces(section: Draft<SectionOf<'locations'>>, event: InvitationEventData) {
    for (const [field, value] of Object.entries(placeValues(event)) as [PlaceField, string][]) {
        if (section.data[field] !== value) section.data[field] = value;
    }
}

function applyProgram(section: Draft<SectionOf<'program'> | SectionOf<'programIcons'>>, event: InvitationEventData) {
    if (!event.sessions?.length) return;
    const oldIds = section.data.items.map((item) => item.id);
    const sessions = sortedSessions(event.sessions);
    const rows = sessions.map((session) => ({ id: session.id, time: programTime(session, event.timezone), label: session.title }));
    if (section.type === 'program') {
        if (!sameValues(rows, section.data.items)) section.data.items = rows;
    } else {
        // The icons are the host's: each stays with its session.
        const icons = new Map(section.data.items.map((item) => [item.id, item.icon]));
        const items = sessions.map((session, index) => ({
            ...rows[index],
            description: session.description ?? '',
            icon: icons.get(session.id) ?? ({ kind: 'auto' } as const),
        }));
        if (!sameValues(items, section.data.items)) section.data.items = items;
    }
    if (!sameValues(oldIds, section.data.items.map((item) => item.id))) carryRowStyles(section, oldIds);
}

// The theme's sample sections by id: what a section held before anyone typed in it. The editor reads them from the
// theme; the published page has none.
export type SampleSections = ReadonlyMap<string, Section>;

// The sample sections of a theme the catalogue sent. Throws when its document isn't in the format.
export function readSampleSections(theme: { document: unknown }): SampleSections {
    return new Map(upgradeInvitationDocument(theme.document).sections.map((section) => [section.id, section]));
}

function samplePhoto(section: Draft<Section>, samples: SampleSections | null, frameId?: string) {
    const sample = samples?.get(section.id);
    if (!sample || sample.type !== section.type) return undefined;
    if (frameId) return coverFrame(sample)?.id === frameId ? coverFrame(sample)?.photo : undefined;
    return sample.type === 'photo' ? sample.data.photo : undefined;
}

// The event has no cover any more: an event photo it left goes back to the theme's photo, or to none.
function dropGoneCover(section: Draft<Section>, samples: SampleSections) {
    if (section.type === 'photo' && section.link?.enabled && section.data.photo?.source === 'event') {
        section.data.photo = samplePhoto(section, samples);
    }
    const frame = section.type === 'top' ? coverFrame(section) : undefined;
    if (frame?.link?.enabled && frame.photo?.source === 'event') frame.photo = samplePhoto(section, samples, frame.id);
}

// Writes the event's values into one section: the locked ones always, the cover where it follows.
function applySection(section: Draft<Section>, event: InvitationEventData, language: 'el' | 'en', samples: SampleSections | null = null) {
    // Without the theme (the published page, or before it loads) the saved photo stays.
    if (!event.cover && samples) dropGoneCover(section, samples);
    switch (section.type) {
        case 'top':
            applyNames(section, event.title);
            break;
        case 'coupleNames': {
            const names = splitNames(event.title);
            if (names) [section.data.partnerAName, section.data.partnerBName] = names;
            break;
        }
        case 'baby':
            if (event.title.trim()) section.data.babyName = event.title.trim();
            break;
        case 'date': {
            const iso = event.startAt ? localDateTime(event.startAt, event.timezone) : null;
            if (!iso) break;
            // The words are the event's date in the date's language, even where the host typed others before the
            // section was linked again. Only what differs is written, so a second sync changes nothing.
            const expected = { ...section.data, iso };
            applyDateLanguage(expected, section.data.displayLanguage);
            section.data.iso = iso;
            for (const word of DATE_WORDS) {
                if (section.data[word] !== expected[word]) section.data[word] = expected[word] as string;
            }
            break;
        }
        case 'rsvp': {
            const deadline = event.rsvp?.deadline;
            const local = deadline ? localDateTime(deadline, event.timezone) : null;
            if (local) {
                const [month, day] = local.slice(5, 10).split('-').map(Number);
                const date = dayAndMonthWords(month, day, language);
                section.data.deadline = INVITATION_LABELS[language].rsvpDeadline.replace('{date}', date);
            }
            break;
        }
        case 'program':
        case 'programIcons':
            applyProgram(section, event);
            break;
        case 'locations':
            applyPlaces(section, event);
            break;
        case 'photo':
            if (section.link?.enabled && event.cover && !(section.data.photo?.source === 'event' && section.data.photo.mediaId === event.cover.mediaId)) {
                section.data.photo = { source: 'event', mediaId: event.cover.mediaId };
            }
            break;
    }
    if (section.type === 'top' && event.cover) {
        const frame = coverFrame(section);
        if (frame?.link?.enabled) applyCover(frame, event.cover);
    }
}

function applyEvent(draft: Draft<InvitationDocument>, event: InvitationEventData, samples: SampleSections | null = null) {
    const language = invitationLanguage(draft as InvitationDocument);
    for (const section of draft.sections) applySection(section, event, language, samples);
}

// Whether the Photo section still holds the theme's photo, or a new section's: only then may it start showing the
// cover, so the event never replaces the host's photo.
function photoHoldsSample(section: SectionOf<'photo'>, samples: SampleSections, eventType: string): boolean {
    const sample = samples.get(section.id);
    if (sample?.type === 'photo') return sameValues(sample.data.photo ?? null, section.data.photo ?? null);
    const fresh = createSection('photo' as NewSectionType, eventType);
    return fresh.type === 'photo' && sameValues(fresh.data.photo ?? null, section.data.photo ?? null);
}

function frameHoldsSample(top: Section, frame: PhotoFrame, samples: SampleSections): boolean {
    const sampleFrame = samples.get(top.id)?.type === top.type ? coverFrame(samples.get(top.id)!) : undefined;
    return sampleFrame?.id === frame.id ? sameValues(sampleFrame.photo, frame.photo) : !frame.photo;
}

// Whether a section may follow the event: one of the linkable types, with something of the event to show. Of the
// Photo sections only the first, and only when the top has no frame for the cover.
function mayFollow(draft: Draft<InvitationDocument>, section: Draft<Section>, event: InvitationEventData): boolean {
    if (!LINKABLE_SECTION_TYPES.has(section.type)) return false;
    const top = draft.sections.find((item) => item.type === 'top');
    if (section.type === 'photo') {
        const firstPhoto = draft.sections.find((item) => item.type === 'photo');
        const otherLinked = draft.sections.some((item) => item.type === 'photo' && item.id !== section.id && item.link);
        if (firstPhoto?.id !== section.id || otherLinked) return false;
    }
    return eventFeeds(section as Section, event, Boolean(top && coverFrame(top)));
}

// Every locked section the event has values for follows it, whatever the host typed or switched off before. The
// cover starts following only where the theme's photo is still in place; a cover the host took over stays theirs.
function linkSections(draft: Draft<InvitationDocument>, event: InvitationEventData, samples: SampleSections | null) {
    for (const section of draft.sections) {
        if (LOCKED_SECTION_TYPES.has(section.type)) {
            if (mayFollow(draft, section, event) && !section.link?.enabled) section.link = { ...FOLLOWING };
        } else if (samples && section.type === 'photo' && !section.link && mayFollow(draft, section, event)) {
            if (photoHoldsSample(section as SectionOf<'photo'>, samples, event.eventType)) section.link = { ...FOLLOWING };
        }
        const frame = section.type === 'top' ? coverFrame(section) : undefined;
        if (samples && frame && !frame.link && event.cover && frameHoldsSample(section as Section, frame as PhotoFrame, samples)) {
            frame.link = { ...FOLLOWING };
        }
    }
}

// The document with the event's data in every field that follows it. Changes nothing else; the same document back
// when nothing changes. The public page runs it on the published copy.
export function resolveLinkedSections(document: InvitationDocument, event: InvitationEventData | null): InvitationDocument {
    if (!event) return document;
    return produce(document, (draft) => applyEvent(draft, event));
}

// The editor's sync: links what follows the event and writes the event into it. A recipe for the editor store.
export function syncWithEvent(event: InvitationEventData, samples: SampleSections | null) {
    return (draft: Draft<InvitationDocument>) => {
        linkSections(draft, event, samples);
        applyEvent(draft, event, samples);
    };
}

// A section the host adds follows the event from the start and shows its data at once. Runs in the same edit as the
// add, so one undo takes both away.
export function followFromTheStart(sectionId: string, event: InvitationEventData, samples: SampleSections | null = null) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (!section || section.link || !mayFollow(draft, section, event)) return;
        section.link = { ...FOLLOWING };
        applySection(section, event, invitationLanguage(draft as InvitationDocument), samples);
    };
}

// --- The cover: taking it over and following again -----------------------------------------------------------------

function sameValues(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

// Runs inside every editor edit: a cover the edit changed becomes the invitation's own.
export function takeOverEditedFields(before: InvitationDocument, draft: Draft<InvitationDocument>) {
    const previous = new Map(before.sections.map((section) => [section.id, section]));
    for (const section of draft.sections) {
        const old = previous.get(section.id);
        if (section.type === 'photo' && old?.type === 'photo' && section.link?.enabled && old.link?.enabled) {
            if (!sameValues(old.data.photo ?? null, section.data.photo ?? null)) section.link.enabled = false;
        }
        if (section.type === 'top' && old?.type === 'top') {
            const frame = coverFrame(section);
            const oldFrame = coverFrame(old);
            if (frame?.link?.enabled && oldFrame?.id === frame.id && oldFrame.link?.enabled && !sameValues(oldFrame.photo, frame.photo)) {
                frame.link.enabled = false;
            }
        }
    }
}

// The link the cover's "Follow the event" switch controls: the Photo section's own, or the top's frame's.
function coverLink(section: Section): EventLink | undefined {
    if (section.type === 'photo') return section.link;
    return section.type === 'top' ? coverFrame(section)?.link : undefined;
}

// Whether the section has a "Follow the event" switch for its cover, and whether it is on.
export function followState(section: Section): { available: boolean; following: boolean } {
    const link = coverLink(section);
    return { available: Boolean(link), following: Boolean(link?.enabled) };
}

// The cover's switch: on, the cover follows the event again and shows it at once; off, it keeps its photo.
export function setFollowEvent(sectionId: string, following: boolean, event: InvitationEventData | null, samples: SampleSections | null = null) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (!section) return;
        if (section.type === 'photo' && section.link) section.link.enabled = following;
        if (section.type === 'top') {
            const frame = coverFrame(section);
            if (frame?.link) frame.link.enabled = following;
        }
        if (following && event) applySection(section, event, invitationLanguage(draft as InvitationDocument), samples);
    };
}

// --- Locked fields ---------------------------------------------------------------------------------------------------

// Where the host changes a text field the event fills, or null when the host may type in it here.
export function textLock(
    section: Section,
    target: { kind: 'field'; path: string } | { kind: 'element'; elementId: string },
    event: InvitationEventData | null,
): EventFieldSource | null {
    if (!event || !isLocked(section, event)) return null;
    if (target.kind === 'element') {
        return section.type === 'top' && topNameElements(section).some((element) => element.id === target.elementId) ? 'settings' : null;
    }
    const field = target.path.split('.')[0];
    switch (section.type) {
        case 'coupleNames':
            return field === 'partnerAName' || field === 'partnerBName' ? 'settings' : null;
        case 'baby':
            return field === 'babyName' ? 'settings' : null;
        case 'date':
            return (DATE_WORDS as readonly string[]).includes(field) ? 'settings' : null;
        case 'rsvp':
            return field === 'deadline' ? 'rsvp' : null;
        case 'program':
        case 'programIcons':
            return field === 'items' && !target.path.endsWith('.icon') ? 'schedule' : null;
        case 'locations':
            return placeFieldLock(field, event);
        default:
            return null;
    }
}

// A place's name, address or map link is locked once the event has a value for that detail; until then the host
// types it. The ceremony is the event's own place (or its main session, which mirrors it); the reception is a
// session of the schedule.
export function placeFieldLock(field: string, event: InvitationEventData | null): EventFieldSource | null {
    if (!event || !(field in placeValues(event))) return null;
    return (CEREMONY_FIELDS as readonly string[]).includes(field) ? 'settings' : 'schedule';
}

// Whether the program's rows are the event's sessions, so they can't be added, removed or retyped here.
export function programLock(section: Section, event: InvitationEventData | null): EventFieldSource | null {
    return event && (section.type === 'program' || section.type === 'programIcons') && isLocked(section, event) ? 'schedule' : null;
}

// The same as textLock, for the text being edited anywhere in the document.
export function editedTextLock(document: InvitationDocument, target: TextTarget | null, event: InvitationEventData | null): EventFieldSource | null {
    if (!target || !event) return null;
    const sectionId = textSectionId(document, target);
    const section = document.sections.find((item) => item.id === sectionId);
    if (!section) return null;
    return textLock(section, target.kind === 'field' ? { kind: 'field', path: target.path } : target, event);
}
