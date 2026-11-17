import type { InvitationSection, SectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';

// A section the host can add from the editor (the footer comes with the theme).
export type NewSectionType = Exclude<SectionType, 'footer'>;

type SectionOf<T extends SectionType> = Extract<InvitationSection, { type: T }>;
type NewSection<T extends NewSectionType> = { name: string; data: SectionOf<T>['data']; style?: Partial<SectionStyle>; elements?: SectionOf<T>['elements'] };

// The old editor started every new section on the theme's background, with
// every theme background open to the host.
const THEME_STYLE: SectionStyle = {
    background: { kind: 'theme', slot: 'auto' },
    hostBackgrounds: { enabled: true, allowed: ['top', 'content', 'extra'] },
    textContrast: 'auto',
};

const NO_CONTACTS = { phone: '', sms: '', email: '', facebook: '', instagram: '', tiktok: '' };

type EventKind = 'wedding' | 'baptism' | 'other';

function eventKind(eventType: string): EventKind {
    if (eventType === 'WEDDING') return 'wedding';
    if (eventType === 'BAPTISM') return 'baptism';
    return 'other';
}

// The starting content of each new section, word for word from the old
// editor's section factories (section-runtime.js). Only the schedules change
// with the event type, as there.
const DEFAULTS: { [T in NewSectionType]: (newId: () => string, kind: EventKind) => NewSection<T> } = {
    top: () => ({ name: 'TOP Section', data: {} }),
    baby: () => ({
        name: 'Μωρό',
        data: {
            babyName: 'Οδυσσέας',
            babyMessage: 'Ήρθα στον κόσμο με πολλή αγάπη και θα χαρώ πολύ να γιορτάσουμε μαζί τη βάπτισή μου.',
        },
    }),
    parentsPhoto: () => ({
        name: 'Γονείς',
        data: {
            parentsTitle: 'Οι γονείς μου',
            parentA: { label: 'Ο μπαμπάς', name: 'Νίκος Παπαδόπουλος' },
            parentB: { label: 'Η μαμά', name: 'Μαρία Ιωάννου' },
        },
    }),
    godparents: (newId) => ({
        name: 'Νονοί',
        data: { godparentsTitle: 'Οι νονοί', godparents: [{ id: newId(), name: 'Ελένη Δημητρίου' }] },
    }),
    parentsSimple: (newId) => ({
        name: 'Γονείς & Νονοί (απλό)',
        data: {
            parentsTitle: 'Οι γονείς',
            parentAName: 'Νίκος Παπαδόπουλος',
            parentBName: 'Μαρία Ιωάννου',
            godparentsTitle: 'Οι νονοί',
            godparents: [{ id: newId(), name: 'Ελένη Δημητρίου' }],
        },
    }),
    invitation: () => ({
        name: 'Κείμενο πρόσκλησης',
        data: { text: 'Με μεγάλη χαρά σας προσκαλούμε στη βάπτιση του μικρού μας.' },
    }),
    date: () => ({
        name: 'Ημερομηνία',
        data: {
            iso: '2026-07-12T18:00',
            displayStyle: 'original',
            displayLanguage: 'el',
            day: 'Κυριακή',
            number: '12',
            month: 'Ιουλίου 2026',
            monthName: 'Ιούλιος',
            monthNumber: '07',
            time: '18:00',
            yearLabel: '2026',
            yearShort: '26',
        },
    }),
    // The old factory left the label empty and the page showed this one.
    countdown: () => ({ name: 'Αντίστροφη μέτρηση', data: { label: 'Ραντεβού σε...' } }),
    locations: () => ({
        name: 'Εκκλησία & Δεξίωση',
        data: {
            ceremony: 'Ιερός Ναός Αγίου Νικολάου',
            ceremonyAddress: 'Παραλία Ρόδου',
            ceremonyMap: '',
            welcomeEnabled: false,
            welcome: 'Welcome Party',
            welcomeAddress: '',
            welcomeMap: '',
            note: 'Θα ακολουθήσει δεξίωση στον ίδιο χώρο',
            reception: 'Κτήμα Αύρα',
            receptionAddress: 'Λεωφόρος Ρόδου 12',
            receptionMap: '',
            desktopColumns: 2,
        },
    }),
    parents: () => ({ name: 'Γονείς & Νονοί', data: { parents: 'Μαρία & Νίκος', godparents: 'Άννα & Γιώργος' } }),
    rsvp: () => ({ name: 'RSVP', data: { title: 'Θα χαρούμε να είστε μαζί μας', deadline: 'Απαντήστε έως 5 Ιουλίου' } }),
    gift: () => ({
        name: 'Λίστα βάπτισης',
        data: { title: 'Προαιρετική Λίστα βάπτισης', bank: 'Τράπεζα Demo', iban: 'GR00 0000 0000 0000 0000 0000 000' },
    }),
    accommodation: (newId) => ({
        name: 'Διαμονή',
        data: {
            title: 'Διαμονή',
            subtitle: 'Για όσους έρχονται από μακριά, προτείνουμε τα παρακάτω καταλύματα.',
            items: [
                {
                    id: newId(),
                    name: 'Ξενοδοχείο Demo',
                    address: 'Λεωφόρος Παραδείγματος 12, Αθήνα',
                    phone: '210 1234567',
                    email: 'info@example.gr',
                    website: '',
                    mapUrl: '',
                },
            ],
        },
    }),
    program: (newId, kind) => {
        const rows: [string, string][] = {
            baptism: [['11:00', 'Μυστήριο Βάπτισης'], ['12:00', 'Δεξίωση']] as [string, string][],
            wedding: [['16:30', 'Τελετή Γάμου'], ['18:30', 'Δεξίωση'], ['20:00', 'Χορός & Διασκέδαση']] as [string, string][],
            other: [['18:00', 'Έναρξη εκδήλωσης']] as [string, string][],
        }[kind];
        const title = { baptism: 'Πρόγραμμα Βάπτισης', wedding: 'Πρόγραμμα Γάμου', other: 'Πρόγραμμα Εκδήλωσης' }[kind];
        return { name: 'Πρόγραμμα', data: { title, items: rows.map(([time, label]) => ({ id: newId(), time, label })) } };
    },
    programIcons: (newId, kind) => {
        const rows: [string, string, string][] = {
            baptism: [
                ['11:00', 'Μυστήριο', 'Ιερός Ναός'],
                ['12:30', 'Υποδοχή', 'Καλωσόρισμα καλεσμένων'],
                ['13:00', 'Γεύμα / Κέρασμα', 'Στον χώρο της δεξίωσης'],
                ['15:00', 'Τούρτα', 'Ώρα για γλυκό'],
                ['16:00', 'Party', 'Ώρα για διασκέδαση!'],
            ] as [string, string, string][],
            wedding: [
                ['17:00', 'Τελετή', 'Ιερός Ναός'],
                ['18:30', 'Welcome Drink', 'Καλωσόρισμα καλεσμένων'],
                ['20:00', 'Δεξίωση', 'Στον χώρο της δεξίωσης'],
                ['22:00', 'First Dance', 'Η πρώτη μας μελωδία'],
                ['23:00', 'Party Time', 'Ώρα για διασκέδαση!'],
            ] as [string, string, string][],
            other: [
                ['18:00', 'Έναρξη', 'Καλωσόρισμα καλεσμένων'],
                ['20:00', 'Κύρια στιγμή', ''],
                ['22:00', 'Party', 'Ώρα για διασκέδαση!'],
            ] as [string, string, string][],
        }[kind];
        return {
            name: 'Πρόγραμμα Timeline Icons',
            data: {
                title: 'Πρόγραμμα',
                subtitle: kind === 'baptism' ? 'Η ροή της ημέρας της βάπτισης' : 'Η ροή της ημέρας μας',
                items: rows.map(([time, label, description]) => ({ id: newId(), time, label, description, icon: { kind: 'auto' as const } })),
            },
        };
    },
    contact: () => ({
        name: 'Επικοινωνία',
        data: { title: 'Επικοινωνήστε με τους γονείς μου', ...NO_CONTACTS, phone: '6900000000', sms: '6900000000' },
    }),
    gallery: () => ({ name: 'Photo Gallery', data: { title: 'Οι φωτογραφίες μας', images: [], layout: 'grid', shape: 'roundedSquare' } }),
    faq: (newId) => ({
        name: 'Συχνές Ερωτήσεις',
        data: {
            title: 'Συχνές Ερωτήσεις',
            items: [
                { id: newId(), question: 'Τι να φορέσω;', answer: 'Ό,τι σας κάνει να νιώθετε άνετα και όμορφα!' },
                { id: newId(), question: 'Υπάρχει πάρκινγκ;', answer: 'Ναι, υπάρχει διαθέσιμος χώρος στάθμευσης κοντά στον χώρο.' },
            ],
        },
    }),
    blank: () => ({ name: 'Κενό Section', data: {} }),
    photo: () => ({ name: 'Φωτογραφία', data: { imageY: 50 }, style: { minHeight: 420 } }),
    coupleNames: () => ({ name: 'Ονόματα Ζευγαριού', data: { partnerAName: 'Μαριάννα', partnerBName: 'Ζαχαρίας' } }),
    ourStoryProposal: () => ({
        name: 'Η ιστορία μας',
        data: {
            block1Title: 'Our Story',
            block1Subtitle: 'Η γνωριμία μας',
            block1Body: 'Γνωριστήκαμε μέσω κοινών φίλων!\n\nΓράψτε εδώ τη δική σας ιστορία...',
            block2Title: 'The proposal',
            block2Subtitle: 'Η πρόταση',
            block2Body: 'Μετά από χρόνια σχέσης... επιτέλους ήρθε και η πρόταση γάμου!',
        },
    }),
    dressCode: () => ({
        name: 'Dress Code',
        data: {
            title: 'DRESS CODE',
            note: 'Σας προτρέπουμε να φορέσετε αυτά τα χρώματα για τη μεγάλη μας μέρα',
            colors: ['#4c5c3a', '#8fa17a', '#c97b83', '#a08974', '#e3c5ad'],
        },
    }),
    coupleContact: () => ({
        name: 'Επικοινωνία Ζευγαριού',
        data: {
            title: 'Επικοινωνία με το ζευγάρι',
            partnerA: { name: 'Νύφη', ...NO_CONTACTS },
            partnerB: { name: 'Γαμπρός', ...NO_CONTACTS },
        },
    }),
    weddingSponsors: (newId) => ({
        name: 'Κουμπάροι',
        data: { sponsorsTitle: 'Οι κουμπάροι', sponsors: [{ id: newId(), name: 'Ελένη Δημητρίου' }] },
    }),
    coupleProfiles: () => ({
        name: 'Το ζευγάρι',
        data: {
            partnerA: { name: 'Σάκης Ζάρρας', role: 'Ο γαμπρός', familyLabel: 'Οικογένεια', familyNames: 'Αθηναγόρα & Γεωργίας Ζάρρα' },
            partnerB: { name: 'Λυδία Πάσχου', role: 'Η νύφη', familyLabel: 'Οικογένεια', familyNames: 'Γεωργίου & Μαρίας Πάσχου' },
            desktopColumns: 2,
        },
    }),
    coupleProfilesSimple: () => ({
        name: 'Το ζευγάρι (χωρίς φωτο)',
        data: {
            partnerA: { name: 'Σάκης Ζάρρας', role: 'Ο γαμπρός', familyLabel: 'Οικογένεια', familyNames: 'Αθηναγόρα & Γεωργίας Ζάρρα' },
            partnerB: { name: 'Λυδία Πάσχου', role: 'Η νύφη', familyLabel: 'Οικογένεια', familyNames: 'Γεωργίου & Μαρίας Πάσχου' },
            desktopColumns: 2,
        },
    }),
    weddingSponsorsSimple: () => ({
        name: 'Κουμπάροι (χωρίς φωτο)',
        data: { sponsorsTitle: 'Οι κουμπάροι', sponsorsNames: 'Ελένη Δημητρίου\nΓιώργος Κωνσταντίνου' },
    }),
    // Starts with one empty frame for the admin to pick.
    photoFrame: (newId) => ({
        name: 'Φωτογραφία με κορνίζα',
        data: {},
        style: { minHeight: 420 },
        elements: [
            {
                id: newId(),
                kind: 'photoFrame',
                frameId: '',
                imageX: 50,
                imageY: 50,
                zoom: 1,
                boxScale: 1,
                imageWidth: 0,
                imageHeight: 0,
                animation: 'none',
            },
        ],
    }),
};

export const newSectionId = () => crypto.randomUUID();

// A new section of the given type, filled the way the old editor filled it.
// `newId` makes the section's id first, then its items' ids in order.
export function createSection(type: NewSectionType, eventType: string, newId: () => string = newSectionId): InvitationSection {
    const id = newId();
    const made = (DEFAULTS[type] as (newId: () => string, kind: EventKind) => NewSection<NewSectionType>)(newId, eventKind(eventType));
    return {
        id,
        type,
        name: made.name,
        visible: true,
        locked: false,
        data: made.data,
        textStyles: {},
        elements: made.elements ?? [],
        style: { ...THEME_STYLE, ...made.style },
    } as InvitationSection;
}
