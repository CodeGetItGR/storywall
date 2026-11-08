import { INVITATION_SCHEMA_VERSION, type InvitationDocument } from '@/lib/invitation/document';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';

// One filled-in section per type, built from the old editor's defaults. Used
// by the format tests and as fixtures for the renderer and editor.

const themeStyle: SectionStyle = {
    background: { kind: 'theme', slot: 'auto' },
    hostBackgrounds: { enabled: true, allowed: ['top', 'content', 'extra'] },
    textContrast: 'auto',
};

type SectionOf<T extends SectionType> = Extract<InvitationSection, { type: T }>;

function section<T extends SectionType>(
    type: T,
    data: SectionOf<T>['data'],
    extra: Partial<Omit<SectionOf<T>, 'type' | 'data'>> = {},
): SectionOf<T> {
    return {
        id: `s-${type}`,
        type,
        name: type,
        visible: true,
        locked: false,
        data,
        textStyles: {},
        elements: [],
        style: themeStyle,
        ...extra,
    } as unknown as SectionOf<T>;
}

const photo = (mediaId: string) => ({ source: 'media' as const, mediaId });
const noContacts = { phone: '', sms: '', email: '', facebook: '', instagram: '', tiktok: '' };

export const SAMPLE_SECTIONS: { [T in SectionType]: SectionOf<T> } = {
    top: section('top', {}, { style: { ...themeStyle, minHeight: 640, effect: { type: 'fallingPetals', speed: 'slow', intensity: 'subtle' } } }),
    baby: section('baby', { babyName: 'Μαρία', babyPhoto: photo('m-baby'), babyMessage: 'Σας περιμένουμε!' }),
    parentsPhoto: section('parentsPhoto', {
        parentsTitle: 'Οι γονείς',
        parentA: { label: 'Μπαμπάς', name: 'Νίκος', photo: photo('m-dad') },
        parentB: { label: 'Μαμά', name: 'Ελένη' },
    }, { textStyles: { 'parentA.name': { size: 26, bold: true } } }),
    godparents: section('godparents', {
        godparentsTitle: 'Οι νονοί',
        godparents: [{ id: 'g1', name: 'Γιώργος', photo: photo('m-g1') }, { id: 'g2', name: 'Άννα' }],
    }, { textStyles: { 'godparents.g2.name': { color: '#7a5c61' } } }),
    parentsSimple: section('parentsSimple', {
        parentsTitle: 'Οι γονείς',
        parentAName: 'Νίκος',
        parentBName: 'Ελένη',
        godparentsTitle: 'Οι νονοί',
        godparents: [{ id: 'g1', name: 'Γιώργος' }],
        decoration: { image: { source: 'theme', assetId: 'el-leaf' }, width: 220 },
    }),
    invitation: section('invitation', { text: 'Με χαρά σας προσκαλούμε…' }, {
        elements: [{ id: 'e-inv-title', kind: 'text', role: 'title', text: 'Πρόσκληση', style: { size: 32, align: 'center' } }],
    }),
    date: section('date', {
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
    }),
    countdown: section('countdown', { label: 'Ραντεβού σε...', numberStyle: { size: 44, color: '#2f2b2d' } }),
    locations: section('locations', {
        ceremony: 'Ιερός Ναός Αγίου Νικολάου',
        ceremonyAddress: 'Παραλία Ρόδου',
        ceremonyMap: 'https://maps.google.com/?q=Rhodes',
        welcomeEnabled: false,
        welcome: '',
        welcomeAddress: '',
        welcomeMap: '',
        note: '',
        reception: 'Κτήμα',
        receptionAddress: 'Ρόδος',
        receptionMap: '',
        desktopColumns: 2,
    }),
    parents: section('parents', { parents: 'Νίκος & Ελένη', godparents: 'Γιώργος' }),
    rsvp: section('rsvp', { title: 'Θα έρθετε;', deadline: 'έως 1 Ιουλίου', formStyle: { buttonBg: '#b8dfd3', fieldRadius: 12 } }),
    gift: section('gift', { title: 'Λίστα δώρων', bank: 'Τράπεζα', iban: 'GR00 0000 0000 0000 0000 0000 000' }),
    accommodation: section('accommodation', {
        title: 'Διαμονή',
        subtitle: '',
        items: [{ id: 'h1', name: 'Ξενοδοχείο', address: 'Ρόδος', phone: '', email: '', website: 'https://example.com', mapUrl: '' }],
        cardStyle: { borderWidth: 1, borderColor: '#dddddd' },
    }),
    program: section('program', {
        title: 'Πρόγραμμα',
        items: [{ id: 'p1', time: '18:00', label: 'Μυστήριο' }],
    }),
    programIcons: section('programIcons', {
        title: 'Πρόγραμμα',
        subtitle: '',
        items: [
            { id: 'p1', time: '17:00', label: 'Τελετή', description: '', icon: { kind: 'auto' } },
            { id: 'p2', time: '20:00', label: 'Δεξίωση', description: '', icon: { kind: 'preset', key: 'champagne' } },
            { id: 'p3', time: '23:00', label: 'Party', description: '', icon: { kind: 'custom', image: photo('m-icon'), mode: 'mask', name: 'Δικό μου' } },
        ],
        programStyle: { timeColor: '#8a6d3b', lineWidth: 2 },
    }, { textStyles: { 'items.p2.label': { italic: true } } }),
    contact: section('contact', { title: 'Επικοινωνία', ...noContacts, phone: '6900000000', iconStyle: { color: '#2f2b2d' } }),
    gallery: section('gallery', { title: 'Οι φωτογραφίες μας', images: [photo('m-1'), photo('m-2')], layout: 'grid', shape: 'roundedSquare' }),
    faq: section('faq', {
        title: 'Συχνές ερωτήσεις',
        items: [{ id: 'q1', question: 'Υπάρχει πάρκινγκ;', answer: 'Ναι.' }],
        faqStyle: { questionColor: '#2f2b2d', borderWidth: 1 },
    }),
    blank: section('blank', {}, {
        elements: [
            { id: 'e-b-title', kind: 'text', role: 'title', text: 'Τίτλος', style: { size: 32 }, fullWidth: true },
            { id: 'e-b-left', kind: 'text', role: 'paragraph', text: 'Αριστερά', style: {} },
            { id: 'e-b-break', kind: 'columnBreak' },
            { id: 'e-b-img', kind: 'image', image: { source: 'theme', assetId: 'el-leaf' }, width: 260 },
            { id: 'e-b-gap', kind: 'spacer', height: 40 },
            { id: 'e-b-link', kind: 'link', text: 'Δείτε περισσότερα', url: 'https://example.com' },
        ],
    }),
    photo: section('photo', { photo: photo('m-photo'), imageY: 50 }, { style: { ...themeStyle, minHeight: 420 } }),
    coupleNames: section('coupleNames', { partnerAName: 'Μαρία', partnerBName: 'Γιάννης' }),
    ourStoryProposal: section('ourStoryProposal', {
        block1Title: 'Πώς γνωριστήκαμε',
        block1Subtitle: '2019',
        block1Body: 'Γνωριστήκαμε μέσω κοινών φίλων!',
        block2Title: 'Η πρόταση',
        block2Subtitle: '2025',
        block2Body: 'Μετά από χρόνια σχέσης... επιτέλους ήρθε και η πρόταση γάμου!',
    }),
    dressCode: section('dressCode', { title: 'Dress code', note: 'Καλοκαιρινό', colors: ['#b8dfd3', '#efe7ec'] }),
    coupleContact: section('coupleContact', {
        title: 'Επικοινωνία',
        partnerA: { name: 'Μαρία', ...noContacts },
        partnerB: { name: 'Γιάννης', ...noContacts, instagram: 'https://instagram.com/example' },
    }),
    weddingSponsors: section('weddingSponsors', { sponsorsTitle: 'Κουμπάροι', sponsors: [{ id: 'k1', name: 'Κώστας' }] }),
    coupleProfiles: section('coupleProfiles', {
        partnerA: { name: 'Γιάννης', role: 'Γαμπρός', familyLabel: 'Γονείς', familyNames: 'Νίκος & Ελένη', photo: photo('m-a') },
        partnerB: { name: 'Μαρία', role: 'Νύφη', familyLabel: 'Γονείς', familyNames: 'Πέτρος & Σοφία' },
        desktopColumns: 2,
    }),
    coupleProfilesSimple: section('coupleProfilesSimple', {
        partnerA: { name: 'Γιάννης', role: 'Γαμπρός', familyLabel: 'Γονείς', familyNames: '' },
        partnerB: { name: 'Μαρία', role: 'Νύφη', familyLabel: 'Γονείς', familyNames: '' },
        desktopColumns: 2,
    }),
    weddingSponsorsSimple: section('weddingSponsorsSimple', { sponsorsTitle: 'Κουμπάροι', sponsorsNames: 'Κώστας\nΔήμητρα' }),
    photoFrame: section('photoFrame', {}, {
        elements: [{
            id: 'e-frame',
            kind: 'photoFrame',
            frameId: 'fr-oval',
            photo: photo('m-framed'),
            imageX: 50,
            imageY: 50,
            zoom: 1,
            boxScale: 1,
            imageWidth: 1200,
            imageHeight: 800,
            animation: 'fade-in',
        }],
        style: { ...themeStyle, minHeight: 420, transition: { assetId: 'tr-wave', edge: 'bottom' } },
    }),
    footer: section('footer', { text: 'Made with Storywall', link: '' }, {
        locked: true,
        style: { ...themeStyle, background: { kind: 'color', color: '#efe7ec' } },
    }),
};

export const SAMPLE_THEME: ThemeDesign = {
    backgrounds: {
        top: { desktop: { mediaId: 'm-top' }, mobile: { mediaId: 'm-top-mobile' }, mode: 'cover', stableRepeat: false },
        content: { desktop: { mediaId: 'm-content' }, mode: 'repeat', stableRepeat: true },
        extra: { mode: 'cover', stableRepeat: false },
    },
    art: { main: { image: { mediaId: 'm-main-art' }, scale: 1, animation: 'none' } },
    colors: { primary: '#b8dfd3', secondary: '#efe7ec', text: '#2f2b2d' },
    fonts: { title: 'Georgia,serif', body: 'Arial,sans-serif' },
    autoTextContrast: false,
    photoShape: 'rounded',
    textAnimation: 'none',
    elements: [{ id: 'el-leaf', name: 'Φύλλο', image: { mediaId: 'm-leaf' } }],
    frames: [{ id: 'fr-oval', name: 'Οβάλ', art: { mediaId: 'm-frame-art' }, mask: { mediaId: 'm-frame-mask' }, width: 900, height: 1200 }],
    transitions: [{ id: 'tr-wave', name: 'Κύμα', desktop: { mediaId: 'm-wave' } }],
};

export const SAMPLE_DOCUMENT: InvitationDocument = {
    schemaVersion: INVITATION_SCHEMA_VERSION,
    themeId: 'theme-1',
    overrides: {},
    sections: Object.values(SAMPLE_SECTIONS),
};
