import { describe, expect, it } from 'vitest';

import { convertState } from '@/lib/invitation/convert/convert';
import { MediaCollector } from '@/lib/invitation/convert/media';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import { SECTION_TYPES,sectionSchema } from '@/lib/invitation/sections';

// The old editor's section factories (public/legacy/section-runtime.js in the
// old Save my date app), copied as they are. A new section must come out
// exactly as the converter turns the old one into the new format.
type Category = 'Γάμος' | 'Βάπτιση' | 'Γενέθλια';
const themeStyle = () => ({ mode: 'theme', color: '', image: '' });

function oldFactories(uid: () => string, category: Category): Record<NewSectionType, () => Record<string, unknown>> {
    const isBaptism = category === 'Βάπτιση';
    return {
        top: () => ({ id: uid(), type: 'top', name: 'TOP Section', data: {}, texts: [], style: themeStyle() }),
        baby: () => ({ id: uid(), type: 'baby', name: 'Μωρό', data: { babyName: 'Οδυσσέας', babyPhoto: '', babyMessage: 'Ήρθα στον κόσμο με πολλή αγάπη και θα χαρώ πολύ να γιορτάσουμε μαζί τη βάπτισή μου.' }, texts: [], style: themeStyle() }),
        parentsPhoto: () => ({ id: uid(), type: 'parentsPhoto', name: 'Γονείς', data: { parentsTitle: 'Οι γονείς μου', dad: { label: 'Ο μπαμπάς', name: 'Νίκος Παπαδόπουλος', photo: '' }, mom: { label: 'Η μαμά', name: 'Μαρία Ιωάννου', photo: '' } }, texts: [], style: themeStyle() }),
        godparents: () => ({ id: uid(), type: 'godparents', name: 'Νονοί', data: { godparentsTitle: 'Οι νονοί', godparents: [{ id: uid(), name: 'Ελένη Δημητρίου', photo: '' }] }, texts: [], style: themeStyle() }),
        parentsSimple: () => ({ id: uid(), type: 'parentsSimple', name: 'Γονείς & Νονοί (απλό)', data: { parentsTitle: 'Οι γονείς', dadName: 'Νίκος Παπαδόπουλος', momName: 'Μαρία Ιωάννου', godparentsTitle: 'Οι νονοί', godparents: [{ id: uid(), name: 'Ελένη Δημητρίου' }], element1: '' }, texts: [], style: themeStyle() }),
        invitation: () => ({ id: uid(), type: 'invitation', name: 'Κείμενο πρόσκλησης', data: { text: 'Με μεγάλη χαρά σας προσκαλούμε στη βάπτιση του μικρού μας.' }, texts: [], style: themeStyle() }),
        date: () => ({ id: uid(), type: 'date', name: 'Ημερομηνία', data: { day: 'Κυριακή', number: '12', month: 'Ιουλίου 2026', time: '18:00', iso: '2026-07-12T18:00', displayStyle: 'original', displayLanguage: 'el', monthName: 'Ιούλιος', monthNumber: '07', yearLabel: '2026', yearShort: '26' }, texts: [], style: themeStyle() }),
        countdown: () => ({ id: uid(), type: 'countdown', name: 'Αντίστροφη μέτρηση', data: {}, texts: [], style: themeStyle() }),
        locations: () => ({ id: uid(), type: 'locations', name: 'Εκκλησία & Δεξίωση', data: { church: 'Ιερός Ναός Αγίου Νικολάου', churchAddress: 'Παραλία Ρόδου', welcomeEnabled: false, welcome: 'Welcome Party', welcomeAddress: '', note: 'Θα ακολουθήσει δεξίωση στον ίδιο χώρο', reception: 'Κτήμα Αύρα', receptionAddress: 'Λεωφόρος Ρόδου 12', desktopColumns: 2 }, texts: [], style: themeStyle() }),
        parents: () => ({ id: uid(), type: 'parents', name: 'Γονείς & Νονοί', data: { parents: 'Μαρία & Νίκος', godparents: 'Άννα & Γιώργος' }, texts: [], style: themeStyle() }),
        rsvp: () => ({ id: uid(), type: 'rsvp', name: 'RSVP', data: { title: 'Θα χαρούμε να είστε μαζί μας', deadline: 'Απαντήστε έως 5 Ιουλίου' }, texts: [], style: themeStyle() }),
        gift: () => ({ id: uid(), type: 'gift', name: 'Λίστα βάπτισης', data: { title: 'Προαιρετική Λίστα βάπτισης', bank: 'Τράπεζα Demo', iban: 'GR00 0000 0000 0000 0000 0000 000' }, texts: [], style: themeStyle() }),
        accommodation: () => ({ id: uid(), type: 'accommodation', name: 'Διαμονή', data: { title: 'Διαμονή', subtitle: 'Για όσους έρχονται από μακριά, προτείνουμε τα παρακάτω καταλύματα.', items: [{ id: uid(), name: 'Ξενοδοχείο Demo', address: 'Λεωφόρος Παραδείγματος 12, Αθήνα', phone: '210 1234567', email: 'info@example.gr', website: '', mapUrl: '' }] }, texts: [], style: themeStyle() }),
        program: () => {
            const title = isBaptism ? 'Πρόγραμμα Βάπτισης' : (category === 'Γάμος' ? 'Πρόγραμμα Γάμου' : 'Πρόγραμμα Εκδήλωσης');
            const id = uid();
            const items = isBaptism
                ? [{ id: uid(), time: '11:00', label: 'Μυστήριο Βάπτισης' }, { id: uid(), time: '12:00', label: 'Δεξίωση' }]
                : (category === 'Γάμος'
                    ? [{ id: uid(), time: '16:30', label: 'Τελετή Γάμου' }, { id: uid(), time: '18:30', label: 'Δεξίωση' }, { id: uid(), time: '20:00', label: 'Χορός & Διασκέδαση' }]
                    : [{ id: uid(), time: '18:00', label: 'Έναρξη εκδήλωσης' }]);
            return { id, type: 'program', name: 'Πρόγραμμα', data: { title, items }, texts: [], style: themeStyle() };
        },
        programIcons: () => {
            const title = 'Πρόγραμμα';
            const subtitle = isBaptism ? 'Η ροή της ημέρας της βάπτισης' : 'Η ροή της ημέρας μας';
            const id = uid();
            const items = isBaptism
                ? [
                    { id: uid(), time: '11:00', label: 'Μυστήριο', description: 'Ιερός Ναός', iconKey: 'auto' },
                    { id: uid(), time: '12:30', label: 'Υποδοχή', description: 'Καλωσόρισμα καλεσμένων', iconKey: 'auto' },
                    { id: uid(), time: '13:00', label: 'Γεύμα / Κέρασμα', description: 'Στον χώρο της δεξίωσης', iconKey: 'auto' },
                    { id: uid(), time: '15:00', label: 'Τούρτα', description: 'Ώρα για γλυκό', iconKey: 'auto' },
                    { id: uid(), time: '16:00', label: 'Party', description: 'Ώρα για διασκέδαση!', iconKey: 'auto' },
                ]
                : (category === 'Γάμος'
                    ? [
                        { id: uid(), time: '17:00', label: 'Τελετή', description: 'Ιερός Ναός', iconKey: 'auto' },
                        { id: uid(), time: '18:30', label: 'Welcome Drink', description: 'Καλωσόρισμα καλεσμένων', iconKey: 'auto' },
                        { id: uid(), time: '20:00', label: 'Δεξίωση', description: 'Στον χώρο της δεξίωσης', iconKey: 'auto' },
                        { id: uid(), time: '22:00', label: 'First Dance', description: 'Η πρώτη μας μελωδία', iconKey: 'auto' },
                        { id: uid(), time: '23:00', label: 'Party Time', description: 'Ώρα για διασκέδαση!', iconKey: 'auto' },
                    ]
                    : [
                        { id: uid(), time: '18:00', label: 'Έναρξη', description: 'Καλωσόρισμα καλεσμένων', iconKey: 'auto' },
                        { id: uid(), time: '20:00', label: 'Κύρια στιγμή', description: '', iconKey: 'auto' },
                        { id: uid(), time: '22:00', label: 'Party', description: 'Ώρα για διασκέδαση!', iconKey: 'auto' },
                    ]);
            return { id, type: 'programIcons', name: 'Πρόγραμμα Timeline Icons', data: { title, subtitle, items }, texts: [], style: themeStyle() };
        },
        contact: () => ({ id: uid(), type: 'contact', name: 'Επικοινωνία', data: { title: 'Επικοινωνήστε με τους γονείς μου', phone: '6900000000', sms: '6900000000', email: '', facebook: '', instagram: '', tiktok: '', iconStyle: {} }, texts: [], style: themeStyle() }),
        gallery: () => ({ id: uid(), type: 'gallery', name: 'Photo Gallery', data: { title: 'Οι φωτογραφίες μας', images: [], active: 0, layout: 'grid', shape: 'roundedSquare' }, texts: [], style: themeStyle() }),
        faq: () => ({ id: uid(), type: 'faq', name: 'Συχνές Ερωτήσεις', data: { title: 'Συχνές Ερωτήσεις', items: [{ q: 'Τι να φορέσω;', a: 'Ό,τι σας κάνει να νιώθετε άνετα και όμορφα!' }, { q: 'Υπάρχει πάρκινγκ;', a: 'Ναι, υπάρχει διαθέσιμος χώρος στάθμευσης κοντά στον χώρο.' }] }, texts: [], style: themeStyle() }),
        blank: () => ({ id: uid(), type: 'blank', name: 'Κενό Section', data: {}, texts: [], style: themeStyle() }),
        photo: () => ({ id: uid(), type: 'photo', name: 'Φωτογραφία', data: { src: '', imageY: 50 }, texts: [], style: { minHeight: 420 } }),
        coupleNames: () => ({ id: uid(), type: 'coupleNames', name: 'Ονόματα Ζευγαριού', data: { name1: 'Μαριάννα', name2: 'Ζαχαρίας' }, texts: [], style: themeStyle() }),
        ourStoryProposal: () => ({ id: uid(), type: 'ourStoryProposal', name: 'Η ιστορία μας', data: { block1Title: 'Our Story', block1Subtitle: 'Η γνωριμία μας', block1Body: 'Γνωριστήκαμε μέσω κοινών φίλων!\n\nΓράψτε εδώ τη δική σας ιστορία...', block2Title: 'The proposal', block2Subtitle: 'Η πρόταση', block2Body: 'Μετά από χρόνια σχέσης... επιτέλους ήρθε και η πρόταση γάμου!' }, texts: [], style: themeStyle() }),
        dressCode: () => ({ id: uid(), type: 'dressCode', name: 'Dress Code', data: { title: 'DRESS CODE', note: 'Σας προτρέπουμε να φορέσετε αυτά τα χρώματα για τη μεγάλη μας μέρα', colors: ['#4c5c3a', '#8fa17a', '#c97b83', '#a08974', '#e3c5ad'] }, texts: [], style: themeStyle() }),
        coupleContact: () => ({ id: uid(), type: 'coupleContact', name: 'Επικοινωνία Ζευγαριού', data: { title: 'Επικοινωνία με το ζευγάρι', bride: { name: 'Νύφη', phone: '', sms: '', email: '', facebook: '', instagram: '', tiktok: '' }, groom: { name: 'Γαμπρός', phone: '', sms: '', email: '', facebook: '', instagram: '', tiktok: '' }, iconStyle: {} }, texts: [], style: themeStyle() }),
        weddingSponsors: () => ({ id: uid(), type: 'weddingSponsors', name: 'Κουμπάροι', data: { sponsorsTitle: 'Οι κουμπάροι', sponsors: [{ id: uid(), name: 'Ελένη Δημητρίου', photo: '' }] }, texts: [], style: themeStyle() }),
        coupleProfiles: () => ({ id: uid(), type: 'coupleProfiles', name: 'Το ζευγάρι', data: { groom: { photo: '', name: 'Σάκης Ζάρρας', role: 'Ο γαμπρός', familyLabel: 'Οικογένεια', familyNames: 'Αθηναγόρα & Γεωργίας Ζάρρα' }, bride: { photo: '', name: 'Λυδία Πάσχου', role: 'Η νύφη', familyLabel: 'Οικογένεια', familyNames: 'Γεωργίου & Μαρίας Πάσχου' }, desktopColumns: 2 }, texts: [], style: themeStyle() }),
        coupleProfilesSimple: () => ({ id: uid(), type: 'coupleProfilesSimple', name: 'Το ζευγάρι (χωρίς φωτο)', data: { groom: { name: 'Σάκης Ζάρρας', role: 'Ο γαμπρός', familyLabel: 'Οικογένεια', familyNames: 'Αθηναγόρα & Γεωργίας Ζάρρα' }, bride: { name: 'Λυδία Πάσχου', role: 'Η νύφη', familyLabel: 'Οικογένεια', familyNames: 'Γεωργίου & Μαρίας Πάσχου' }, element1: '' }, texts: [], style: themeStyle() }),
        weddingSponsorsSimple: () => ({ id: uid(), type: 'weddingSponsorsSimple', name: 'Κουμπάροι (χωρίς φωτο)', data: { sponsorsTitle: 'Οι κουμπάροι', sponsorsNames: 'Ελένη Δημητρίου\nΓιώργος Κωνσταντίνου', element1: '' }, texts: [], style: themeStyle() }),
        photoFrame: () => ({ id: uid(), type: 'photoFrame', name: 'Φωτογραφία με κορνίζα', data: {}, texts: [{ id: uid(), kind: 'photoFrame', frameId: '', src: '', imageX: 50, imageY: 50, zoom: 1, boxScale: 1, imageWidth: 0, imageHeight: 0 }], style: { minHeight: 420 } }),
    };
}

// Ids in the order the new factory makes them: the section's, then its items'.
function counter() {
    let next = 0;
    return () => `id${next++}`;
}

// The old FAQ items had no ids; the converter names them after the section.
function withFaqIds(oldSection: Record<string, unknown>, ids: () => string) {
    const data = oldSection.data as { items: Record<string, unknown>[] };
    return { ...oldSection, data: { ...data, items: data.items.map((item) => ({ ...item, id: ids() })) } };
}

function convertOld(oldSection: Record<string, unknown>) {
    const result = convertState({ state: { theme: {}, sections: [oldSection] }, themeId: 'theme1', themeName: 'Θέμα' }, new MediaCollector());
    expect(result.warnings).toEqual([]);
    return result.document.sections[0];
}

const NEW_TYPES = SECTION_TYPES.filter((type): type is NewSectionType => type !== 'footer');
const EVENTS: [string, Category][] = [['WEDDING', 'Γάμος'], ['BAPTISM', 'Βάπτιση'], ['BIRTHDAY', 'Γενέθλια']];

describe('createSection', () => {
    describe.each(EVENTS)('for %s', (eventType, category) => {
        it.each(NEW_TYPES)('makes %s as the old editor did', (type) => {
            const made = createSection(type, eventType, counter());
            const ids = counter();
            const old = type === 'faq'
                ? (() => { const section = oldFactories(ids, category).faq(); return withFaqIds(section, ids); })()
                : oldFactories(ids, category)[type]();
            expect(made).toEqual(convertOld(old));
        });
    });

    it.each(NEW_TYPES)('makes a valid, shown, unlocked %s', (type) => {
        const section = createSection(type, 'WEDDING');
        expect(sectionSchema.safeParse(section).success).toBe(true);
        expect(section).toMatchObject({ type, visible: true, locked: false });
    });

    it('gives every new section and item its own id', () => {
        const first = createSection('faq', 'WEDDING');
        const second = createSection('faq', 'WEDDING');
        expect(first.id).not.toBe(second.id);
        const itemIds = [first, second].flatMap((section) => (section.type === 'faq' ? section.data.items.map((item) => item.id) : []));
        expect(new Set(itemIds).size).toBe(4);
    });
});
