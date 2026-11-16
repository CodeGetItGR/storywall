import { type Draft, produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { type InvitationDocument,invitationDocumentSchema } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { InvitationElement } from '@/lib/invitation/elements';
import {
    editedTextLock,
    followFromTheStart,
    followState,
    type InvitationEventData,
    localDateTime,
    placeFieldLock,
    programLock,
    resolveLinkedSections,
    type SampleSections,
    setFollowEvent,
    splitNames,
    syncWithEvent,
    takeOverEditedFields,
    textLock,
} from '@/lib/invitation/eventLinks';
import { createSection } from '@/lib/invitation/newSection';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { insertSection } from '@/lib/invitation/sectionActions';
import type { InvitationSection } from '@/lib/invitation/sections';

const frame: InvitationElement = {
    id: 'e-cover',
    kind: 'photoFrame',
    frameId: '',
    photo: { source: 'media', mediaId: 'm-own' },
    imageX: 30,
    imageY: 40,
    zoom: 1.2,
    boxScale: 1,
    imageWidth: 900,
    imageHeight: 600,
    animation: 'none',
};

const top: InvitationSection = {
    ...SAMPLE_SECTIONS.top,
    elements: [
        { id: 'e-a', kind: 'text', role: 'title', text: 'Μαρία', style: {} },
        { id: 'e-amp', kind: 'text', role: 'paragraph', text: '&', style: {} },
        { id: 'e-b', kind: 'text', role: 'title', text: 'Γιάννης', style: {} },
        frame,
    ],
};

function sampleDocument(sections: InvitationSection[] = []): InvitationDocument {
    return {
        schemaVersion: 1,
        themeId: 't1',
        overrides: {},
        sections: [
            top,
            SAMPLE_SECTIONS.coupleNames,
            SAMPLE_SECTIONS.date,
            SAMPLE_SECTIONS.rsvp,
            SAMPLE_SECTIONS.programIcons,
            SAMPLE_SECTIONS.locations,
            SAMPLE_SECTIONS.gallery,
            ...sections,
            SAMPLE_SECTIONS.footer,
        ],
    };
}

function eventData(overrides: Partial<InvitationEventData> = {}): InvitationEventData {
    return {
        eventType: 'WEDDING',
        title: 'Άγγελος & Αλεξάνδρα',
        timezone: 'Europe/Athens',
        // 19:30 in Athens (summer time).
        startAt: '2027-08-29T16:30:00Z',
        rsvp: { deadline: '2027-07-05T09:00:00Z' },
        cover: { mediaId: 'm-cover', width: 1600, height: 1000 },
        location: { name: 'Κτήμα Ρόδων', address: 'Ρόδος', mapsUrl: 'https://maps.google.com/?q=rodon' },
        sessions: [
            {
                id: 's-party',
                title: 'Δεξίωση',
                description: 'Φαγητό και χορός',
                startAt: '2027-08-29T18:00:00Z',
                locationName: 'Κτήμα Ρόδων',
                mapsUrl: 'https://maps.google.com/?q=rodon',
                displayOrder: 1,
                isMain: false,
                isSecondary: true,
            },
            {
                id: 's-church',
                title: 'Μυστήριο',
                description: null,
                startAt: '2027-08-29T16:30:00Z',
                locationName: 'Άγιος Νικόλαος',
                mapsUrl: 'https://maps.google.com/?q=church',
                displayOrder: 0,
                isMain: true,
                isSecondary: false,
            },
        ],
        joinUrl: null,
        ...overrides,
    };
}

// The theme a draft was made from: by default the draft itself, as a new draft is.
function samplesOf(document: InvitationDocument): SampleSections {
    return new Map(document.sections.map((section) => [section.id, section]));
}

function synced(document: InvitationDocument, event: InvitationEventData = eventData(), samples: SampleSections | null = samplesOf(document)): InvitationDocument {
    return produce(document, syncWithEvent(event, samples));
}

function edited(document: InvitationDocument, recipe: (draft: Draft<InvitationDocument>) => void): InvitationDocument {
    return produce(document, recipe);
}

function find<T extends InvitationSection['type']>(document: InvitationDocument, type: T): Extract<InvitationSection, { type: T }> {
    const section = document.sections.find((item) => item.type === type);
    if (!section) throw new Error(`No ${type}`);
    return section as Extract<InvitationSection, { type: T }>;
}

function texts(document: InvitationDocument): string[] {
    return find(document, 'top').elements.flatMap((element) => (element.kind === 'text' ? [element.text] : []));
}

function coverOf(document: InvitationDocument) {
    const element = find(document, 'top').elements.find((item) => item.kind === 'photoFrame');
    if (element?.kind !== 'photoFrame') throw new Error('No frame');
    return element;
}

describe('event values', () => {
    it('reads an instant on the venue clock', () => {
        expect(localDateTime('2027-08-29T16:30:00Z', 'Europe/Athens')).toBe('2027-08-29T19:30');
        expect(localDateTime('2027-01-10T16:30:00Z', 'Europe/Athens')).toBe('2027-01-10T18:30');
        expect(localDateTime('not a date', 'Europe/Athens')).toBeNull();
        expect(localDateTime('2027-01-10T16:30:00Z', 'Not/AZone')).toBeNull();
    });

    it('splits a title into exactly two names', () => {
        expect(splitNames('Άγγελος & Αλεξάνδρα')).toEqual(['Άγγελος', 'Αλεξάνδρα']);
        expect(splitNames('Άγγελος&Αλεξάνδρα')).toEqual(['Άγγελος', 'Αλεξάνδρα']);
        expect(splitNames('Γάμος')).toBeNull();
        expect(splitNames('Α & Β & Γ')).toBeNull();
        expect(splitNames(' & Β')).toBeNull();
    });
});


describe('syncWithEvent', () => {
    it('links every section the event can feed and fills it in', () => {
        const document = synced(sampleDocument());

        expect(texts(document)).toEqual(['Άγγελος', '&', 'Αλεξάνδρα']);
        expect(find(document, 'coupleNames').data).toMatchObject({ partnerAName: 'Άγγελος', partnerBName: 'Αλεξάνδρα' });
        expect(find(document, 'date').data).toMatchObject({ iso: '2027-08-29T19:30', day: 'Κυριακή', number: '29', monthName: 'Αύγουστος', time: '19:30' });
        expect(find(document, 'rsvp').data.deadline).toBe('Απαντήστε έως 5 Ιουλίου');
        expect(find(document, 'locations').data).toMatchObject({
            ceremony: 'Άγιος Νικόλαος',
            ceremonyMap: 'https://maps.google.com/?q=church',
            // A main session without its own address (an older backend): the event's, which it mirrors.
            ceremonyAddress: 'Ρόδος',
            reception: 'Κτήμα Ρόδων',
            receptionMap: 'https://maps.google.com/?q=rodon',
            // A session without an address: the invitation's own stays.
            receptionAddress: 'Ρόδος',
        });
        expect(coverOf(document)).toMatchObject({ photo: { source: 'event', mediaId: 'm-cover' }, imageWidth: 1600, imageHeight: 1000 });
        for (const type of ['top', 'coupleNames', 'date', 'rsvp', 'programIcons', 'locations'] as const) {
            expect(find(document, type).link).toEqual({ source: 'event', enabled: true });
        }
        // The gallery holds picked photos instead.
        expect(find(document, 'gallery')).not.toHaveProperty('link');
        expect(() => invitationDocumentSchema.parse(document)).not.toThrow();
    });

    it("writes each session's address into its place", () => {
        const sessions = eventData().sessions!.map((session) => ({ ...session, locationAddress: session.isMain ? 'Λίνδος' : 'Φαληράκι' }));
        expect(find(synced(sampleDocument(), eventData({ sessions })), 'locations').data).toMatchObject({
            ceremonyAddress: 'Λίνδος',
            receptionAddress: 'Φαληράκι',
        });
    });

    it('writes the schedule in time order with session ids, keeping row styles and icons', () => {
        const document = synced(sampleDocument());
        const items = find(document, 'programIcons').data.items;

        expect(items.map((item) => [item.id, item.time, item.label, item.description])).toEqual([
            ['s-church', '19:30', 'Μυστήριο', ''],
            ['s-party', '21:00', 'Δεξίωση', 'Φαγητό και χορός'],
        ]);
        expect(items.map((item) => item.icon)).toEqual([{ kind: 'auto' }, { kind: 'auto' }]);
        // 'items.p2.label' was the second row; it stays with the second row.
        expect(find(document, 'programIcons').textStyles).toEqual({ 'items.s-party.label': { italic: true } });
    });

    it('keeps a picked icon when the session stays', () => {
        const once = synced(sampleDocument());
        const picked = produce(once, (draft) => {
            const section = draft.sections.find((item) => item.type === 'programIcons');
            if (section?.type === 'programIcons') section.data.items[1].icon = { kind: 'preset', key: 'champagne' };
        });
        expect(find(synced(picked), 'programIcons').data.items[1].icon).toEqual({ kind: 'preset', key: 'champagne' });
    });

    it('gives a one-name top the whole title and a baby section the title', () => {
        const single: InvitationSection = { ...top, elements: [{ id: 'e-name', kind: 'text', role: 'title', text: 'Αλέξανδρος', style: {} }] };
        const document = synced({ ...sampleDocument(), sections: [single, SAMPLE_SECTIONS.baby, SAMPLE_SECTIONS.footer] }, eventData({ title: 'Οδυσσέας', eventType: 'BAPTISM' }));

        expect(texts(document)).toEqual(['Οδυσσέας']);
        expect(find(document, 'baby').data.babyName).toBe('Οδυσσέας');
    });

    it('leaves two names alone when the title does not split', () => {
        const document = synced(sampleDocument(), eventData({ title: 'Ο γάμος μας' }));

        expect(texts(document)).toEqual(['Μαρία', '&', 'Γιάννης']);
        expect(find(document, 'top').link).toBeUndefined();
        expect(find(document, 'coupleNames').link).toBeUndefined();
    });

    it('puts the cover in the first Photo section when the top has no frame', () => {
        const bare: InvitationSection = { ...top, elements: top.elements.filter((element) => element.kind !== 'photoFrame') };
        const second: InvitationSection = { ...SAMPLE_SECTIONS.photo, id: 'photo-2' };
        const document = synced({ ...sampleDocument(), sections: [bare, SAMPLE_SECTIONS.photo, second, SAMPLE_SECTIONS.footer] });
        const photos = document.sections.filter((section) => section.type === 'photo');

        expect(photos[0].link).toEqual({ source: 'event', enabled: true });
        expect(photos[0].data).toMatchObject({ photo: { source: 'event', mediaId: 'm-cover' } });
        expect(photos[1].link).toBeUndefined();
        expect(photos[1].data).toMatchObject({ photo: { source: 'media', mediaId: 'm-photo' } });
    });

    it('keeps the invitation photo, unlinked, when the event has no cover', () => {
        const document = synced(sampleDocument(), eventData({ cover: null }));
        expect(coverOf(document).photo).toEqual({ source: 'media', mediaId: 'm-own' });
        expect(coverOf(document).link).toBeUndefined();
    });

    it("puts the theme's photo back when the event's cover goes", () => {
        const theme = sampleDocument();
        const withCover = synced(theme);
        const document = synced(withCover, eventData({ cover: null }), samplesOf(theme));
        expect(coverOf(document).photo).toEqual({ source: 'media', mediaId: 'm-own' });
        // The published page has no theme to go back to: it keeps the photo it was published with.
        expect(coverOf(resolveLinkedSections(withCover, eventData({ cover: null }))).photo).toEqual(coverOf(withCover).photo);
    });

    it('does not link what the plan does not include', () => {
        const document = synced(sampleDocument(), eventData({ rsvp: null, sessions: null }));

        expect(find(document, 'rsvp').link).toBeUndefined();
        expect(find(document, 'rsvp').data.deadline).toBe('έως 1 Ιουλίου');
        expect(find(document, 'programIcons').link).toBeUndefined();
        expect(find(document, 'programIcons').data.items).toHaveLength(3);
        // No main session: the event's own place, address included.
        expect(find(document, 'locations').data).toMatchObject({ ceremony: 'Κτήμα Ρόδων', ceremonyAddress: 'Ρόδος', reception: 'Κτήμα' });
    });

    it('does not link the RSVP line when the event has no reply-by date', () => {
        const document = synced(sampleDocument(), eventData({ rsvp: { deadline: null } }));
        expect(find(document, 'rsvp').link).toBeUndefined();
        expect(find(document, 'rsvp').data.deadline).toBe('έως 1 Ιουλίου');
    });

    it('does not link the places when the event has none', () => {
        const document = synced(sampleDocument(), eventData({ sessions: [], location: { name: null, address: null, mapsUrl: null } }));
        expect(find(document, 'locations').link).toBeUndefined();
    });

    it("writes the schedule in the event's own order", () => {
        const sessions = eventData().sessions!.map((session) => ({ ...session, displayOrder: session.isMain ? 1 : 0 }));
        const items = find(synced(sampleDocument(), eventData({ sessions })), 'programIcons').data.items;
        expect(items.map((item) => item.id)).toEqual(['s-party', 's-church']);
    });

    it('writes the RSVP line in English for an English invitation', () => {
        const english = produce(sampleDocument(), (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') date.data.displayLanguage = 'en';
        });
        expect(find(synced(english), 'rsvp').data.deadline).toBe('Please reply by July 5');
    });

    it('takes the reception only where the secondary session means it', () => {
        const document = synced(sampleDocument(), eventData({ eventType: 'BIRTHDAY' }));
        expect(find(document, 'locations').data).toMatchObject({ ceremony: 'Άγιος Νικόλαος', reception: 'Κτήμα' });
    });

    it('never writes a map link the format would refuse, and leaves that link to the host', () => {
        const sessions = eventData().sessions!.map((session) => (session.isMain ? { ...session, mapsUrl: 'javascript:alert(1)' } : session));
        const event = eventData({ sessions });
        expect(find(synced(sampleDocument(), event), 'locations').data.ceremonyMap).toBe('https://maps.google.com/?q=Rhodes');
        expect(placeFieldLock('ceremonyMap', event)).toBeNull();
    });

    it("keeps the host's address and map link of a place until the event has its own", () => {
        const sessions = eventData().sessions!.map((session) => ({ ...session, mapsUrl: null }));
        const typed = edited(sampleDocument(), (draft) => {
            const places = draft.sections.find((section) => section.type === 'locations');
            if (places?.type === 'locations') {
                places.data.receptionAddress = 'Φαληράκι';
                places.data.receptionMap = 'https://maps.google.com/?q=faliraki';
            }
        });
        const event = eventData({ sessions, location: { name: 'Κτήμα Ρόδων', address: null, mapsUrl: null } });
        const places = find(synced(typed, event), 'locations').data;

        expect(places).toMatchObject({
            ceremony: 'Άγιος Νικόλαος',
            ceremonyAddress: 'Παραλία Ρόδου',
            ceremonyMap: 'https://maps.google.com/?q=Rhodes',
            reception: 'Κτήμα Ρόδων',
            receptionAddress: 'Φαληράκι',
            receptionMap: 'https://maps.google.com/?q=faliraki',
        });
        expect(placeFieldLock('ceremony', event)).toBe('settings');
        expect(placeFieldLock('ceremonyAddress', event)).toBeNull();
        expect(placeFieldLock('ceremonyMap', event)).toBeNull();
        expect(placeFieldLock('reception', event)).toBe('schedule');
        expect(placeFieldLock('receptionAddress', event)).toBeNull();
        expect(placeFieldLock('receptionMap', event)).toBeNull();
    });

    it("writes the event's date words into a date the host took over, even when the day is the same", () => {
        const owned = produce(synced(sampleDocument()), (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') {
                date.link = { source: 'event', enabled: false };
                date.data.monthName = 'Τρυγητής';
                date.data.day = 'Μεγάλη μέρα';
            }
        });
        const date = find(synced(owned), 'date');
        expect(date.link).toEqual({ source: 'event', enabled: true });
        expect(date.data).toMatchObject({ iso: '2027-08-29T19:30', monthName: 'Αύγουστος', day: 'Κυριακή' });
        // The published page shows the same words.
        expect(find(resolveLinkedSections(owned, eventData()), 'date').data).toMatchObject({ monthName: 'Αύγουστος', day: 'Κυριακή' });
    });

    it('links a section the host took over again, with the event in it', () => {
        const owned = produce(sampleDocument(), (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date) date.link = { source: 'event', enabled: false };
        });
        const date = find(synced(owned), 'date');
        expect(date.link).toEqual({ source: 'event', enabled: true });
        expect(date.data.iso).toBe('2027-08-29T19:30');
    });

    it('links what the host typed in before the event was linked, and shows the event in it', () => {
        const theme = sampleDocument();
        const typed = edited(theme, (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') date.data.iso = '2027-01-01T12:00';
            const program = draft.sections.find((section) => section.type === 'programIcons');
            if (program?.type === 'programIcons') {
                program.data.items[0].label = 'Η τελετή μας';
                program.data.items[0].icon = { kind: 'preset', key: 'champagne' };
            }
            const places = draft.sections.find((section) => section.type === 'locations');
            if (places?.type === 'locations') places.data.ceremonyAddress = 'Πλάκα, Αθήνα';
        });
        const document = synced(typed, eventData(), samplesOf(theme));

        expect(find(document, 'date').link).toEqual({ source: 'event', enabled: true });
        expect(find(document, 'date').data.iso).toBe('2027-08-29T19:30');
        expect(find(document, 'programIcons').link).toEqual({ source: 'event', enabled: true });
        expect(find(document, 'programIcons').data.items.map((item) => item.label)).toEqual(['Μυστήριο', 'Δεξίωση']);
        expect(find(document, 'locations').data.ceremonyAddress).toBe('Ρόδος');
    });

    it('never puts the cover over a photo the host picked before the link', () => {
        const theme = sampleDocument();
        const picked = edited(theme, (draft) => {
            const frame = draft.sections.find((section) => section.type === 'top')?.elements.find((element) => element.kind === 'photoFrame');
            if (frame?.kind === 'photoFrame') frame.photo = { source: 'media', mediaId: 'm-mine' };
        });
        const document = synced(picked, eventData(), samplesOf(theme));
        expect(coverOf(document).link).toBeUndefined();
        expect(coverOf(document).photo).toEqual({ source: 'media', mediaId: 'm-mine' });
        // The names in the same section still follow.
        expect(texts(document)).toEqual(['Άγγελος', '&', 'Αλεξάνδρα']);
    });

    it('links a section added before, still as it was added', () => {
        const added = createSection('coupleNames', 'WEDDING');
        const document = synced(sampleDocument([added]), eventData(), samplesOf(sampleDocument()));
        const couple = document.sections.find((section) => section.id === added.id);
        expect(couple?.link).toEqual({ source: 'event', enabled: true });
    });

    it('links the locked sections before the theme is known, but not the cover', () => {
        const document = synced(sampleDocument(), eventData(), null);
        expect(find(document, 'date').link).toEqual({ source: 'event', enabled: true });
        expect(find(document, 'date').data.iso).toBe('2027-08-29T19:30');
        expect(coverOf(document).link).toBeUndefined();
        expect(coverOf(document).photo).toEqual({ source: 'media', mediaId: 'm-own' });
    });

    it('changes nothing a second time', () => {
        const once = synced(sampleDocument());
        expect(synced(once)).toBe(once);
    });
});

describe('resolveLinkedSections', () => {
    it('shows the event on a published copy without linking anything new', () => {
        const published = synced(sampleDocument());
        const moved = resolveLinkedSections(published, eventData({ startAt: '2027-09-05T15:00:00Z', title: 'Άγγελος & Αλεξάνδρα Π.' }));

        expect(find(moved, 'date').data.iso).toBe('2027-09-05T18:00');
        expect(texts(moved)).toEqual(['Άγγελος', '&', 'Αλεξάνδρα Π.']);
    });

    it("shows the event's values on a copy published before the link, but never its cover", () => {
        const resolved = resolveLinkedSections(sampleDocument(), eventData());
        expect(find(resolved, 'date').data.iso).toBe('2027-08-29T19:30');
        expect(texts(resolved)).toEqual(['Άγγελος', '&', 'Αλεξάνδρα']);
        expect(coverOf(resolved).photo).toEqual({ source: 'media', mediaId: 'm-own' });
        expect(find(resolved, 'date').link).toBeUndefined();
    });

    it('shows the saved copy without event data', () => {
        const published = synced(sampleDocument());
        expect(resolveLinkedSections(published, null)).toBe(published);
    });
});

describe('taking over', () => {
    function editorWith(document: InvitationDocument) {
        return createInvitationEditorStore(synced(document));
    }

    it('never takes a locked section over', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const rsvp = draft.sections.find((section) => section.type === 'rsvp');
            if (rsvp?.type === 'rsvp') rsvp.data.deadline = 'Μέχρι τέλη Ιουλίου';
            const program = draft.sections.find((section) => section.type === 'programIcons');
            if (program?.type === 'programIcons') program.data.items.reverse();
        });
        expect(find(store.getState().document, 'rsvp').link?.enabled).toBe(true);
        expect(find(store.getState().document, 'programIcons').link?.enabled).toBe(true);
    });

    it('takes over only the cover of the top', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const section = draft.sections.find((item) => item.type === 'top');
            const name = section?.elements.find((element) => element.id === 'e-a');
            if (name?.kind === 'text') name.text = 'Άγγελος Ζ.';
        });
        expect(coverOf(store.getState().document).link?.enabled).toBe(true);
        expect(followState(find(store.getState().document, 'top'))).toEqual({ available: true, following: true });

        store.getState().edit((draft) => {
            const element = draft.sections.find((item) => item.type === 'top')?.elements.find((item) => item.kind === 'photoFrame');
            if (element?.kind === 'photoFrame') element.photo = { source: 'media', mediaId: 'm-new' };
        });
        const document = store.getState().document;
        expect(coverOf(document).link?.enabled).toBe(false);
        expect(find(document, 'top').link?.enabled).toBe(true);
        expect(followState(find(document, 'top'))).toEqual({ available: true, following: false });
    });

    it('lets the cover frame be moved without taking it over', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const element = draft.sections.find((item) => item.type === 'top')?.elements.find((item) => item.kind === 'photoFrame');
            if (element?.kind === 'photoFrame') element.imageX = 10;
        });
        expect(coverOf(store.getState().document).link?.enabled).toBe(true);
    });

    it('takes a Photo section over when the host picks a photo, and undo brings the link back', () => {
        const bare: InvitationSection = { ...top, elements: top.elements.filter((element) => element.kind !== 'photoFrame') };
        const store = editorWith({ ...sampleDocument(), sections: [bare, SAMPLE_SECTIONS.photo, SAMPLE_SECTIONS.footer] });
        store.getState().edit((draft) => {
            const photo = draft.sections.find((section) => section.type === 'photo');
            if (photo?.type === 'photo') photo.data.photo = { source: 'media', mediaId: 'm-new' };
        });
        expect(find(store.getState().document, 'photo').link?.enabled).toBe(false);
        store.getState().undo();
        expect(find(store.getState().document, 'photo').link?.enabled).toBe(true);
    });

    it('shows the event again in a section the host added and then edited, when the event changes', () => {
        const event = eventData();
        const store = createInvitationEditorStore(synced(sampleDocument(), event));
        const added = createSection('date', 'WEDDING');
        store.getState().edit((draft) => {
            insertSection({ id: top.id, place: 'after' }, added)(draft);
            followFromTheStart(added.id, event)(draft);
        });
        const addedDate = () => store.getState().document.sections.find((section) => section.id === added.id);
        expect(addedDate()?.link).toEqual({ source: 'event', enabled: true });

        store.getState().edit((draft) => {
            const date = draft.sections.find((section) => section.id === added.id);
            if (date?.type === 'date') date.data.iso = '2027-02-02T12:00';
        });
        store.getState().sync(syncWithEvent(eventData({ startAt: '2027-09-05T15:00:00Z' }), samplesOf(sampleDocument())));

        const date = addedDate();
        expect(date?.type === 'date' && date.data.iso).toBe('2027-09-05T18:00');
        expect(date?.link?.enabled).toBe(true);
    });

    it('is a no-op on a section without a link', () => {
        const before = sampleDocument();
        const after = produce(before, (draft) => {
            takeOverEditedFields(before, draft);
        });
        expect(after).toBe(before);
    });
});

describe('following again', () => {
    it('turns the cover switch back on and shows the event at once, as one undo step', () => {
        const event = eventData();
        const store = createInvitationEditorStore(synced(sampleDocument(), event));
        store.getState().edit((draft) => {
            const element = draft.sections.find((item) => item.type === 'top')?.elements.find((item) => item.kind === 'photoFrame');
            if (element?.kind === 'photoFrame') element.photo = { source: 'media', mediaId: 'm-new' };
        });
        const topSection = find(store.getState().document, 'top');
        expect(followState(topSection)).toEqual({ available: true, following: false });

        store.getState().edit(setFollowEvent(topSection.id, true, event));
        expect(coverOf(store.getState().document).photo).toEqual({ source: 'event', mediaId: 'm-cover' });
        expect(followState(find(store.getState().document, 'top')).following).toBe(true);

        store.getState().undo();
        expect(coverOf(store.getState().document).photo).toEqual({ source: 'media', mediaId: 'm-new' });
    });

    it("puts the theme's photo back when the switch goes on and the event has no cover", () => {
        const theme = sampleDocument();
        const withCover = synced(theme);
        const off = produce(withCover, setFollowEvent(top.id, false, eventData()));
        const on = produce(off, setFollowEvent(top.id, true, eventData({ cover: null }), samplesOf(theme)));
        expect(coverOf(on).photo).toEqual({ source: 'media', mediaId: 'm-own' });
    });

    it("turns only the top's cover, never its names", () => {
        const event = eventData();
        const document = produce(synced(sampleDocument(), event), setFollowEvent(top.id, false, event));
        expect(coverOf(document).link?.enabled).toBe(false);
        expect(find(document, 'top').link?.enabled).toBe(true);
    });

    it('has a switch only for the cover', () => {
        const document = synced(sampleDocument());
        expect(followState(find(document, 'date'))).toEqual({ available: false, following: false });
        expect(followState(find(document, 'locations'))).toEqual({ available: false, following: false });
        expect(followState(SAMPLE_SECTIONS.gallery)).toEqual({ available: false, following: false });
    });
});

describe('locked fields', () => {
    it('says where each text the event fills is changed', () => {
        const document = synced(sampleDocument());
        const event = eventData();
        expect(textLock(find(document, 'top'), { kind: 'element', elementId: 'e-a' }, event)).toBe('settings');
        expect(textLock(find(document, 'top'), { kind: 'element', elementId: 'e-amp' }, event)).toBeNull();
        expect(textLock(find(document, 'coupleNames'), { kind: 'field', path: 'partnerBName' }, event)).toBe('settings');
        expect(textLock(find(document, 'date'), { kind: 'field', path: 'monthName' }, event)).toBe('settings');
        expect(textLock(find(document, 'rsvp'), { kind: 'field', path: 'deadline' }, event)).toBe('rsvp');
        expect(textLock(find(document, 'rsvp'), { kind: 'field', path: 'title' }, event)).toBeNull();
        expect(textLock(find(document, 'programIcons'), { kind: 'field', path: 'items.s-church.label' }, event)).toBe('schedule');
        expect(textLock(find(document, 'programIcons'), { kind: 'field', path: 'items.s-church.description' }, event)).toBe('schedule');
        expect(textLock(find(document, 'locations'), { kind: 'field', path: 'ceremonyAddress' }, event)).toBe('settings');
        expect(textLock(find(document, 'locations'), { kind: 'field', path: 'reception' }, event)).toBe('schedule');
        expect(textLock(find(document, 'locations'), { kind: 'field', path: 'note' }, event)).toBeNull();
    });

    it('locks nothing without an event, and a field only once the event has its value', () => {
        expect(textLock(SAMPLE_SECTIONS.rsvp, { kind: 'field', path: 'deadline' }, null)).toBeNull();
        expect(textLock(SAMPLE_SECTIONS.rsvp, { kind: 'field', path: 'deadline' }, eventData({ rsvp: { deadline: null } }))).toBeNull();
        expect(textLock(SAMPLE_SECTIONS.date, { kind: 'field', path: 'iso' }, eventData({ startAt: null }))).toBeNull();
        expect(textLock(find(sampleDocument(), 'top'), { kind: 'element', elementId: 'e-a' }, eventData({ title: 'Ο γάμος μας' }))).toBeNull();
    });

    it('locks each place once the event has it', () => {
        expect(placeFieldLock('ceremonyMap', eventData())).toBe('settings');
        expect(placeFieldLock('receptionMap', eventData())).toBe('schedule');
        // The reception's session has no address of its own.
        expect(placeFieldLock('receptionAddress', eventData())).toBeNull();
        const sessions = eventData().sessions!.map((session) => ({ ...session, locationAddress: 'Λίνδος' }));
        expect(placeFieldLock('receptionAddress', eventData({ sessions }))).toBe('schedule');
        expect(placeFieldLock('receptionMap', eventData({ eventType: 'BIRTHDAY' }))).toBeNull();
        expect(placeFieldLock('ceremony', eventData({ sessions: [], location: { name: null, address: null, mapsUrl: null } }))).toBeNull();
        expect(placeFieldLock('welcomeMap', eventData())).toBeNull();
        expect(placeFieldLock('ceremony', null)).toBeNull();
    });

    it("locks the program's rows while the event has a schedule", () => {
        const document = synced(sampleDocument());
        expect(programLock(find(document, 'programIcons'), eventData())).toBe('schedule');
        expect(programLock(find(document, 'programIcons'), eventData({ sessions: null }))).toBeNull();
        expect(programLock(find(document, 'date'), eventData())).toBeNull();
        expect(programLock(find(document, 'programIcons'), null)).toBeNull();
    });

    it('finds the section of the text being edited', () => {
        const document = synced(sampleDocument());
        const rsvp = find(document, 'rsvp');
        const event = eventData();
        expect(editedTextLock(document, { kind: 'field', sectionId: rsvp.id, path: 'deadline' }, event)).toBe('rsvp');
        expect(editedTextLock(document, { kind: 'element', elementId: 'e-a' }, event)).toBe('settings');
        expect(editedTextLock(document, { kind: 'element', elementId: 'e-missing' }, event)).toBeNull();
        expect(editedTextLock(document, null, event)).toBeNull();
        expect(editedTextLock(document, { kind: 'element', elementId: 'e-a' }, null)).toBeNull();
    });
});
