import { type Draft, produce } from 'immer';

import { applyDateLanguage, dayAndMonthWords } from '@/lib/invitation/dateDisplay';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { INVITATION_LABELS, invitationLanguage } from '@/lib/invitation/labels';
import { type EventLink, linkSchema } from '@/lib/invitation/primitives';
import { type InvitationSection, LINKABLE_SECTION_TYPES } from '@/lib/invitation/sections';

// The invitation following its event (KAN-84; docs/superpowers/specs/2026-11-06-invitation-module-integration-design.md,
// "Following the event"). What the event knows fills the invitation's linked fields until the host edits them on the
// invitation. Nothing here ever writes to the event.

export type InvitationEventSession = {
    id: string;
    title: string;
    description: string | null;
    startAt: string | null;
    locationName: string | null;
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

type Section = InvitationSection;
type SectionOf<T extends Section['type']> = Extract<Section, { type: T }>;
type PhotoFrame = Extract<InvitationElement, { kind: 'photoFrame' }>;

const FOLLOWING: EventLink = { source: 'event', enabled: true };

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

function sortedSessions(sessions: InvitationEventSession[]): InvitationEventSession[] {
    const start = (session: InvitationEventSession) => (session.startAt ? new Date(session.startAt).getTime() : Number.MAX_SAFE_INTEGER);
    return [...sessions].sort((a, b) => start(a) - start(b) || a.displayOrder - b.displayOrder);
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
const PLACE_FIELDS = ['ceremony', 'ceremonyAddress', 'ceremonyMap', 'reception', 'receptionMap'] as const;

// The values a section's own `link` covers. An edit that changes them takes the section over.
function followedValues(section: Section): unknown {
    switch (section.type) {
        case 'top':
            return topNameElements(section).map((element) => (element.kind === 'text' ? element.text : ''));
        case 'coupleNames':
            return [section.data.partnerAName, section.data.partnerBName];
        case 'baby':
            return section.data.babyName;
        case 'date':
            return DATE_WORDS.map((field) => section.data[field] ?? '');
        case 'rsvp':
            return section.data.deadline;
        case 'program':
            return section.data.items.map((item) => [item.id, item.time, item.label]);
        case 'programIcons':
            return section.data.items.map((item) => [item.id, item.time, item.label, item.description]);
        case 'locations':
            return PLACE_FIELDS.map((field) => section.data[field]);
        case 'photo':
            return section.data.photo ?? null;
        default:
            return null;
    }
}

// Whether the event has anything for this section to follow. A section is linked only then, so the switch never
// claims a field comes from the event when it can't.
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
            return event.rsvp !== null;
        case 'program':
        case 'programIcons':
            return event.sessions !== null;
        case 'locations':
            return true;
        case 'photo':
            return !hasTopFrame;
        default:
            return false;
    }
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

function applyPlaces(section: Draft<SectionOf<'locations'>>, event: InvitationEventData) {
    const sessions = event.sessions ?? [];
    const main = sessions.find((session) => session.isMain && session.locationName);
    if (main) {
        section.data.ceremony = main.locationName ?? '';
        section.data.ceremonyMap = mapLink(main.mapsUrl);
    } else if (event.location.name) {
        section.data.ceremony = event.location.name;
        section.data.ceremonyAddress = event.location.address ?? '';
        section.data.ceremonyMap = mapLink(event.location.mapsUrl);
    }
    const reception = RECEPTION_EVENT_TYPES.has(event.eventType)
        ? sessions.find((session) => session.isSecondary && session.locationName)
        : undefined;
    if (reception) {
        section.data.reception = reception.locationName ?? '';
        section.data.receptionMap = mapLink(reception.mapsUrl);
    }
}

function applySection(section: Draft<Section>, event: InvitationEventData, language: 'el' | 'en') {
    switch (section.type) {
        case 'top':
            if (section.link?.enabled) applyNames(section, event.title);
            break;
        case 'coupleNames': {
            const names = splitNames(event.title);
            if (section.link?.enabled && names) [section.data.partnerAName, section.data.partnerBName] = names;
            break;
        }
        case 'baby':
            if (section.link?.enabled && event.title.trim()) section.data.babyName = event.title.trim();
            break;
        case 'date': {
            const iso = section.link?.enabled && event.startAt ? localDateTime(event.startAt, event.timezone) : null;
            // The words are written again only when the date moves, as a language change writes them.
            if (iso && iso !== section.data.iso) {
                section.data.iso = iso;
                applyDateLanguage(section.data, section.data.displayLanguage);
            }
            break;
        }
        case 'rsvp': {
            const deadline = section.link?.enabled ? event.rsvp?.deadline : null;
            const local = deadline ? localDateTime(deadline, event.timezone) : null;
            if (local) {
                const [month, day] = local.slice(5, 10).split('-').map(Number);
                const date = dayAndMonthWords(month, day, language);
                section.data.deadline = INVITATION_LABELS[language].rsvpDeadline.replace('{date}', date);
            }
            break;
        }
        case 'program':
        case 'programIcons': {
            if (!section.link?.enabled || !event.sessions?.length) break;
            const oldIds = section.data.items.map((item) => item.id);
            const sessions = sortedSessions(event.sessions);
            const rows = sessions.map((session) => ({ id: session.id, time: programTime(session, event.timezone), label: session.title }));
            if (section.type === 'program') {
                if (!sameValues(rows, section.data.items)) section.data.items = rows;
            } else {
                const icons = new Map(section.data.items.map((item) => [item.id, item.icon]));
                const items = sessions.map((session, index) => ({
                    ...rows[index],
                    description: session.description ?? '',
                    icon: icons.get(session.id) ?? ({ kind: 'auto' } as const),
                }));
                if (!sameValues(items, section.data.items)) section.data.items = items;
            }
            if (!sameValues(oldIds, section.data.items.map((item) => item.id))) carryRowStyles(section, oldIds);
            break;
        }
        case 'locations':
            if (section.link?.enabled) applyPlaces(section, event);
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

function applyEvent(draft: Draft<InvitationDocument>, event: InvitationEventData) {
    const language = invitationLanguage(draft as InvitationDocument);
    for (const section of draft.sections) applySection(section, event, language);
}

// Links every section that has never been linked and that the event can feed: by default everything follows the
// event. A section the host took over keeps `enabled: false` and is left alone.
function linkNewSections(draft: Draft<InvitationDocument>, event: InvitationEventData) {
    const top = draft.sections.find((section) => section.type === 'top');
    const topFrame = top ? coverFrame(top) : undefined;
    let photoLinked = draft.sections.some((section) => section.type === 'photo' && section.link);
    for (const section of draft.sections) {
        if (section.link || !LINKABLE_SECTION_TYPES.has(section.type)) continue;
        if (section.type === 'photo') {
            // Only the first Photo section, and only when the top has no frame for the cover.
            if (photoLinked) continue;
            photoLinked = true;
        }
        if (eventFeeds(section as Section, event, Boolean(topFrame))) section.link = { ...FOLLOWING };
    }
    if (topFrame && !topFrame.link) topFrame.link = { ...FOLLOWING };
}

// The document with the event's data in every field that follows it. Changes nothing else; the same document back
// when nothing changes. The public page runs it on the published copy.
export function resolveLinkedSections(document: InvitationDocument, event: InvitationEventData | null): InvitationDocument {
    if (!event) return document;
    return produce(document, (draft) => applyEvent(draft, event));
}

// The editor's sync: links what has never been linked, then writes the event in. A recipe for the editor store.
export function syncWithEvent(event: InvitationEventData) {
    return (draft: Draft<InvitationDocument>) => {
        linkNewSections(draft, event);
        applyEvent(draft, event);
    };
}

// --- Taking over and following again -------------------------------------------------------------------------------

function sameValues(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

// Runs inside every editor edit: a followed field the edit changed becomes the invitation's own. A language switch
// rewrites the date's words without taking the date over.
export function takeOverEditedFields(before: InvitationDocument, draft: Draft<InvitationDocument>) {
    const previous = new Map(before.sections.map((section) => [section.id, section]));
    for (const section of draft.sections) {
        const old = previous.get(section.id);
        if (!old || old.type !== section.type) continue;
        if (section.link?.enabled && old.link?.enabled) {
            const languageChanged = section.type === 'date' && old.type === 'date' && old.data.displayLanguage !== section.data.displayLanguage;
            if (!languageChanged && !sameValues(followedValues(old), followedValues(section as Section))) section.link.enabled = false;
        }
        if (section.type === 'top' && old.type === 'top') {
            const frame = coverFrame(section);
            const oldFrame = coverFrame(old);
            if (frame?.link?.enabled && oldFrame?.id === frame.id && oldFrame.link?.enabled && !sameValues(oldFrame.photo, frame.photo)) {
                frame.link.enabled = false;
            }
        }
    }
}

// The links the "Follow the event" switch of one section controls: the section's own, and in the top the cover frame's.
function sectionLinks(section: Section): EventLink[] {
    const links = section.link ? [section.link] : [];
    const frameLink = section.type === 'top' ? coverFrame(section)?.link : undefined;
    return frameLink ? [...links, frameLink] : links;
}

// Whether the section has a "Follow the event" switch, and whether it is on.
export function followState(section: Section): { available: boolean; following: boolean } {
    const links = sectionLinks(section);
    return { available: links.length > 0, following: links.length > 0 && links.every((link) => link.enabled) };
}

// The switch: on, the section follows the event again and shows the event's data at once; off, it keeps its copy.
export function setFollowEvent(sectionId: string, following: boolean, event: InvitationEventData | null) {
    return (draft: Draft<InvitationDocument>) => {
        const section = draft.sections.find((item) => item.id === sectionId);
        if (!section) return;
        if (section.link) section.link.enabled = following;
        if (section.type === 'top') {
            const frame = coverFrame(section);
            if (frame?.link) frame.link.enabled = following;
        }
        if (following && event) applySection(section, event, invitationLanguage(draft as InvitationDocument));
    };
}

// Whether a text field the host is editing follows the event, so the text toolbar can say so.
export function textFollowsEvent(section: Section, target: { kind: 'field'; path: string } | { kind: 'element'; elementId: string }): boolean {
    if (!section.link?.enabled) return false;
    if (target.kind === 'element') {
        return section.type === 'top' && topNameElements(section).some((element) => element.id === target.elementId);
    }
    const field = target.path.split('.')[0];
    switch (section.type) {
        case 'coupleNames':
            return field === 'partnerAName' || field === 'partnerBName';
        case 'baby':
            return field === 'babyName';
        case 'date':
            return (DATE_WORDS as readonly string[]).includes(field);
        case 'rsvp':
            return field === 'deadline';
        case 'program':
        case 'programIcons':
            return field === 'items' && !target.path.endsWith('.icon');
        case 'locations':
            return (PLACE_FIELDS as readonly string[]).includes(field);
        default:
            return false;
    }
}
