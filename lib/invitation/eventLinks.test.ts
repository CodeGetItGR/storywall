import { type Draft, produce } from 'immer';
import { describe, expect, it } from 'vitest';

import { type InvitationDocument,invitationDocumentSchema } from '@/lib/invitation/document';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import type { InvitationElement } from '@/lib/invitation/elements';
import {
    editedTextFollowsEvent,
    followFromTheStart,
    followState,
    type InvitationEventData,
    localDateTime,
    resolveLinkedSections,
    type SampleSections,
    setFollowEvent,
    splitNames,
    syncWithEvent,
    takeOverEditedFields,
    textFollowsEvent,
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
            // A session has no address: the sample's, which belonged to the sample place, goes.
            ceremonyAddress: '',
            reception: 'Κτήμα Ρόδων',
            receptionMap: 'https://maps.google.com/?q=rodon',
        });
        expect(coverOf(document)).toMatchObject({ photo: { source: 'event', mediaId: 'm-cover' }, imageWidth: 1600, imageHeight: 1000 });
        for (const type of ['top', 'coupleNames', 'date', 'rsvp', 'programIcons', 'locations'] as const) {
            expect(find(document, type).link).toEqual({ source: 'event', enabled: true });
        }
        // The gallery holds picked photos instead.
        expect(find(document, 'gallery')).not.toHaveProperty('link');
        expect(() => invitationDocumentSchema.parse(document)).not.toThrow();
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

    it('drops a map link the format would refuse', () => {
        const sessions = eventData().sessions!.map((session) => (session.isMain ? { ...session, mapsUrl: 'javascript:alert(1)' } : session));
        expect(find(synced(sampleDocument(), eventData({ sessions })), 'locations').data.ceremonyMap).toBe('');
    });

    it('leaves a section the host took over alone', () => {
        const owned = produce(sampleDocument(), (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date) date.link = { source: 'event', enabled: false };
        });
        expect(find(synced(owned), 'date').data.iso).toBe('2026-07-12T18:00');
    });

    it("never links a section the host typed in before it could follow the event", () => {
        const theme = sampleDocument();
        const typed = edited(theme, (draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') date.data.iso = '2027-01-01T12:00';
            const program = draft.sections.find((section) => section.type === 'programIcons');
            if (program?.type === 'programIcons') program.data.items[0].label = 'Η τελετή μας';
        });
        const document = synced(typed, eventData(), samplesOf(theme));

        expect(find(document, 'date').link).toBeUndefined();
        expect(find(document, 'date').data.iso).toBe('2027-01-01T12:00');
        expect(find(document, 'programIcons').link).toBeUndefined();
        expect(find(document, 'programIcons').data.items[0].label).toBe('Η τελετή μας');
        // What still holds the theme's text follows.
        expect(find(document, 'rsvp').link).toEqual({ source: 'event', enabled: true });
    });

    it('never links the places when the host typed only an address', () => {
        const theme = sampleDocument();
        const typed = edited(theme, (draft) => {
            const places = draft.sections.find((section) => section.type === 'locations');
            if (places?.type === 'locations') places.data.ceremonyAddress = 'Πλάκα, Αθήνα';
        });
        const document = synced(typed, eventData(), samplesOf(theme));
        expect(find(document, 'locations').link).toBeUndefined();
        expect(find(document, 'locations').data.ceremonyAddress).toBe('Πλάκα, Αθήνα');
    });

    it('never links the program when the host picked only its icons', () => {
        const theme = sampleDocument();
        const picked = edited(theme, (draft) => {
            const program = draft.sections.find((section) => section.type === 'programIcons');
            if (program?.type === 'programIcons') program.data.items[0].icon = { kind: 'preset', key: 'champagne' };
        });
        const document = synced(picked, eventData(), samplesOf(theme));
        expect(find(document, 'programIcons').link).toBeUndefined();
        expect(find(document, 'programIcons').data.items[0].icon).toEqual({ kind: 'preset', key: 'champagne' });
    });

    it('links a section added before, still as it was added', () => {
        const added = createSection('coupleNames', 'WEDDING');
        const document = synced(sampleDocument([added]), eventData(), samplesOf(sampleDocument()));
        const couple = document.sections.find((section) => section.id === added.id);
        expect(couple?.link).toEqual({ source: 'event', enabled: true });
    });

    it('links nothing new before the theme is known, and keeps what follows up to date', () => {
        const once = synced(sampleDocument());
        const fresh = sampleDocument([createSection('coupleNames', 'WEDDING')]);
        expect(synced(fresh, eventData(), null).sections.some((section) => section.link)).toBe(false);
        expect(find(synced(once, eventData({ startAt: '2027-09-05T15:00:00Z' }), null), 'date').data.iso).toBe('2027-09-05T18:00');
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
        expect(resolveLinkedSections(sampleDocument(), eventData())).toEqual(sampleDocument());
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

    it('takes over only the field the host edited', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const rsvp = draft.sections.find((section) => section.type === 'rsvp');
            if (rsvp?.type === 'rsvp') rsvp.data.title = 'Θα έρθετε;!';
        });
        expect(find(store.getState().document, 'rsvp').link?.enabled).toBe(true);

        store.getState().edit((draft) => {
            const rsvp = draft.sections.find((section) => section.type === 'rsvp');
            if (rsvp?.type === 'rsvp') rsvp.data.deadline = 'Μέχρι τέλη Ιουλίου';
        });
        expect(find(store.getState().document, 'rsvp').link?.enabled).toBe(false);
    });

    it('keeps the names and the cover of the top apart', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const section = draft.sections.find((item) => item.type === 'top');
            const name = section?.elements.find((element) => element.id === 'e-a');
            if (name?.kind === 'text') name.text = 'Άγγελος Ζ.';
        });
        const document = store.getState().document;
        expect(find(document, 'top').link?.enabled).toBe(false);
        expect(coverOf(document).link?.enabled).toBe(true);
        expect(followState(find(document, 'top'))).toEqual({ available: true, following: false });

        store.getState().edit((draft) => {
            const element = draft.sections.find((item) => item.type === 'top')?.elements.find((item) => item.kind === 'photoFrame');
            if (element?.kind === 'photoFrame') element.photo = { source: 'media', mediaId: 'm-new' };
        });
        expect(coverOf(store.getState().document).link?.enabled).toBe(false);
    });

    it('lets the cover frame be moved without taking it over', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const element = draft.sections.find((item) => item.type === 'top')?.elements.find((item) => item.kind === 'photoFrame');
            if (element?.kind === 'photoFrame') element.imageX = 10;
        });
        expect(coverOf(store.getState().document).link?.enabled).toBe(true);
    });

    it('does not take the date over on a language switch', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') {
                date.data.displayLanguage = 'en';
                date.data.day = 'Sunday';
            }
        });
        expect(find(store.getState().document, 'date').link?.enabled).toBe(true);
    });

    it('takes the schedule over when a row changes, and undo brings the link back', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const program = draft.sections.find((section) => section.type === 'programIcons');
            if (program?.type === 'programIcons') program.data.items.reverse();
        });
        expect(find(store.getState().document, 'programIcons').link?.enabled).toBe(false);
        store.getState().undo();
        expect(find(store.getState().document, 'programIcons').link?.enabled).toBe(true);
    });

    it("keeps a section the host added and then edited, when the event changes", () => {
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
        expect(date?.type === 'date' && date.data.iso).toBe('2027-02-02T12:00');
        expect(date?.link?.enabled).toBe(false);
    });

    it('lets the host type an address without taking the places over', () => {
        const store = editorWith(sampleDocument());
        store.getState().edit((draft) => {
            const places = draft.sections.find((section) => section.type === 'locations');
            if (places?.type === 'locations') places.data.ceremonyAddress = 'Πλάκα, Αθήνα';
        });
        const places = find(store.getState().document, 'locations');
        expect(places.link?.enabled).toBe(true);
        expect(textFollowsEvent(places, { kind: 'field', path: 'ceremonyAddress' })).toBe(false);
        expect(textFollowsEvent(places, { kind: 'field', path: 'ceremony' })).toBe(true);

        // The address stays while the place does, and goes with it.
        store.getState().sync(syncWithEvent(eventData(), null));
        expect(find(store.getState().document, 'locations').data.ceremonyAddress).toBe('Πλάκα, Αθήνα');
        const moved = eventData().sessions!.map((session) => (session.isMain ? { ...session, locationName: 'Αγία Ειρήνη' } : session));
        store.getState().sync(syncWithEvent(eventData({ sessions: moved }), null));
        expect(find(store.getState().document, 'locations').data).toMatchObject({ ceremony: 'Αγία Ειρήνη', ceremonyAddress: '' });
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
    it('turns the switch back on and shows the event at once, as one undo step', () => {
        const event = eventData();
        const store = createInvitationEditorStore(synced(sampleDocument(), event));
        store.getState().edit((draft) => {
            const date = draft.sections.find((section) => section.type === 'date');
            if (date?.type === 'date') date.data.iso = '2027-01-01T12:00';
        });
        const date = find(store.getState().document, 'date');
        expect(followState(date)).toEqual({ available: true, following: false });

        store.getState().edit(setFollowEvent(date.id, true, event));
        expect(find(store.getState().document, 'date').data.iso).toBe('2027-08-29T19:30');
        expect(followState(find(store.getState().document, 'date')).following).toBe(true);

        store.getState().undo();
        expect(find(store.getState().document, 'date').data.iso).toBe('2027-01-01T12:00');
    });

    it("puts the theme's photo back when the switch goes on and the event has no cover", () => {
        const theme = sampleDocument();
        const withCover = synced(theme);
        const off = produce(withCover, setFollowEvent(top.id, false, eventData()));
        const on = produce(off, setFollowEvent(top.id, true, eventData({ cover: null }), samplesOf(theme)));
        expect(coverOf(on).photo).toEqual({ source: 'media', mediaId: 'm-own' });
    });

    it('turns the names and the cover of the top together', () => {
        const event = eventData();
        const document = produce(synced(sampleDocument(), event), setFollowEvent(top.id, false, event));
        expect(find(document, 'top').link?.enabled).toBe(false);
        expect(coverOf(document).link?.enabled).toBe(false);
    });

    it('has no switch where nothing follows', () => {
        expect(followState(SAMPLE_SECTIONS.gallery)).toEqual({ available: false, following: false });
    });
});

describe('textFollowsEvent', () => {
    it('says which texts follow', () => {
        const document = synced(sampleDocument());
        expect(textFollowsEvent(find(document, 'top'), { kind: 'element', elementId: 'e-a' })).toBe(true);
        expect(textFollowsEvent(find(document, 'top'), { kind: 'element', elementId: 'e-amp' })).toBe(false);
        expect(textFollowsEvent(find(document, 'rsvp'), { kind: 'field', path: 'deadline' })).toBe(true);
        expect(textFollowsEvent(find(document, 'rsvp'), { kind: 'field', path: 'title' })).toBe(false);
        expect(textFollowsEvent(find(document, 'programIcons'), { kind: 'field', path: 'items.s-church.label' })).toBe(true);
        expect(textFollowsEvent(find(document, 'locations'), { kind: 'field', path: 'note' })).toBe(false);
        expect(textFollowsEvent(SAMPLE_SECTIONS.rsvp, { kind: 'field', path: 'deadline' })).toBe(false);
    });

    it('finds the section of the text being edited', () => {
        const document = synced(sampleDocument());
        const rsvp = find(document, 'rsvp');
        expect(editedTextFollowsEvent(document, { kind: 'field', sectionId: rsvp.id, path: 'deadline' })).toBe(true);
        expect(editedTextFollowsEvent(document, { kind: 'element', elementId: 'e-a' })).toBe(true);
        expect(editedTextFollowsEvent(document, { kind: 'element', elementId: 'e-missing' })).toBe(false);
        expect(editedTextFollowsEvent(document, null)).toBe(false);
    });
});
