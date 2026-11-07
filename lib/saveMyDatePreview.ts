import { INVITATION_SCHEMA_VERSION, type InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { DATE_DISPLAY_STYLES, type InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';

// The invitation the staging preview page shows. Its texts are a host's
// content, not app copy, so they stay as data. Images come from public/.

// A sample frame drawn inline, so the preview needs no frame files: the mask is
// the oval the photo shows through, the art is a ring around it.
const svgImage = (body: string) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">${body}</svg>`)}`;

const PREVIEW_MEDIA: Record<string, string> = {
    'm-top': '/images/venue.png',
    'm-main-art': '/images/couple-hero.png',
    'm-leaf': '/images/post-florals.png',
    'm-baby': '/images/couple-hero.png',
    'm-dad': '/images/couple-hero.png',
    'm-g1': '/images/couple-hero.png',
    'm-a': '/images/couple-hero.png',
    'm-icon': '/images/post-florals.png',
    'm-1': '/images/post-flowers.png',
    'm-2': '/images/post-cake.png',
    'm-photo': '/images/venue.png',
    'm-framed': '/images/couple-hero.png',
    'm-frame-mask': svgImage('<ellipse cx="450" cy="600" rx="400" ry="550"/>'),
    'm-frame-art': svgImage('<ellipse cx="450" cy="600" rx="400" ry="550" fill="none" stroke="#b08d57" stroke-width="24"/>'),
};

export const previewMedia: MediaResolver = (mediaId) => PREVIEW_MEDIA[mediaId];

export const PREVIEW_THEME: ThemeDesign = {
    ...SAMPLE_THEME,
    backgrounds: {
        top: { desktop: { mediaId: 'm-top' }, mode: 'cover', stableRepeat: false },
        content: { mode: 'cover', stableRepeat: false },
        extra: { mode: 'cover', stableRepeat: false },
    },
    art: {
        main: { image: { mediaId: 'm-main-art' }, scale: 0.8, animation: 'fade' },
        ceremonyIcon: { image: { mediaId: 'm-icon' }, scale: 1, animation: 'none' },
    },
    fonts: { title: "'Playfair Display',serif", body: "'Lora',serif" },
    autoTextContrast: true,
};

const blank = SAMPLE_SECTIONS.blank;

type DateData = Extract<InvitationSection, { type: 'date' }>['data'];

export type PreviewDateStyle = DateData['displayStyle'];
export type PreviewDateLanguage = DateData['displayLanguage'];

// The date as a host would write it in each language.
const PREVIEW_DATES: Record<PreviewDateLanguage, Omit<DateData, 'displayStyle'>> = {
    el: {
        iso: '2027-06-12T18:00',
        displayLanguage: 'el',
        day: 'Σάββατο',
        number: '12',
        month: 'Ιουνίου 2027',
        monthName: 'Ιούνιος',
        monthGenitive: 'Ιουνίου',
        monthNumber: '06',
        time: '18:00',
        yearLabel: '2027',
        yearShort: '27',
    },
    en: {
        iso: '2027-06-12T18:00',
        displayLanguage: 'en',
        day: 'Saturday',
        number: '12',
        month: 'June 2027',
        monthName: 'June',
        monthNumber: '06',
        time: '18:00',
        yearLabel: '2027',
        yearShort: '27',
    },
};

// The preview's date layout and language come from the address, so every
// layout can be checked: ?date=calendar&lang=en.
export function previewDateOptions(params: { date?: string | string[]; lang?: string | string[] }): {
    style: PreviewDateStyle;
    lang: PreviewDateLanguage;
} {
    const date = typeof params.date === 'string' ? params.date : '';
    const style = (DATE_DISPLAY_STYLES as readonly string[]).includes(date) ? (date as PreviewDateStyle) : 'original';
    return { style, lang: params.lang === 'en' ? 'en' : 'el' };
}

const textSections = (style: PreviewDateStyle, lang: PreviewDateLanguage): InvitationSection[] => [
    {
        ...SAMPLE_SECTIONS.invitation,
        data: { text: 'Με μεγάλη χαρά σας προσκαλούμε\nνα μοιραστείτε μαζί μας την πιο όμορφη μέρα της ζωής μας.' },
    },
    { ...SAMPLE_SECTIONS.coupleNames, data: { partnerAName: 'Μαρία', partnerBName: 'Γιώργος' } },
    { ...SAMPLE_SECTIONS.date, data: { ...PREVIEW_DATES[lang], displayStyle: style } },
    SAMPLE_SECTIONS.countdown,
    {
        ...SAMPLE_SECTIONS.faq,
        data: {
            ...SAMPLE_SECTIONS.faq.data,
            items: [
                { id: 'q1', question: 'Υπάρχει πάρκινγκ;', answer: 'Ναι, δίπλα στον χώρο.' },
                { id: 'q2', question: 'Μπορώ να φέρω τα παιδιά μου;', answer: 'Φυσικά!' },
            ],
        },
    },
    SAMPLE_SECTIONS.dressCode,
    {
        ...SAMPLE_SECTIONS.contact,
        data: { ...SAMPLE_SECTIONS.contact.data, email: 'maria@example.com', instagram: 'instagram.com/example' },
    },
    SAMPLE_SECTIONS.coupleContact,
    SAMPLE_SECTIONS.baby,
    SAMPLE_SECTIONS.parents,
    SAMPLE_SECTIONS.parentsSimple,
    SAMPLE_SECTIONS.parentsPhoto,
    SAMPLE_SECTIONS.godparents,
    SAMPLE_SECTIONS.coupleProfiles,
    SAMPLE_SECTIONS.coupleProfilesSimple,
    SAMPLE_SECTIONS.weddingSponsors,
    SAMPLE_SECTIONS.weddingSponsorsSimple,
    SAMPLE_SECTIONS.ourStoryProposal,
    SAMPLE_SECTIONS.program,
    SAMPLE_SECTIONS.programIcons,
    SAMPLE_SECTIONS.locations,
    SAMPLE_SECTIONS.accommodation,
    SAMPLE_SECTIONS.gift,
    SAMPLE_SECTIONS.rsvp,
    SAMPLE_SECTIONS.photo,
    SAMPLE_SECTIONS.gallery,
    { ...SAMPLE_SECTIONS.photoFrame, style: { ...SAMPLE_SECTIONS.photoFrame.style, transition: undefined } },
    SAMPLE_SECTIONS.footer,
];

// The preview theme's top background is a photo, so the text sections sit
// on the plain content background instead of alternating onto it.
const onContent = (section: InvitationSection): InvitationSection =>
    section.style.background.kind === 'theme'
        ? { ...section, style: { ...section.style, background: { kind: 'theme', slot: 'content' } } }
        : section;

export function previewDocument(style: PreviewDateStyle = 'original', lang: PreviewDateLanguage = 'el'): InvitationDocument {
    return { ...PREVIEW_DOCUMENT, sections: [...PREVIEW_DOCUMENT.sections, ...textSections(style, lang).map(onContent)] };
}

const PREVIEW_DOCUMENT: InvitationDocument = {
    schemaVersion: INVITATION_SCHEMA_VERSION,
    themeId: 'preview',
    overrides: {},
    sections: [
        {
            ...SAMPLE_SECTIONS.top,
            style: { ...SAMPLE_SECTIONS.top.style, effect: undefined },
            elements: [
                { id: 'top-title', kind: 'text', role: 'title', text: 'Μαρία & Γιώργος', style: { size: 44 } },
                { id: 'top-date', kind: 'text', role: 'paragraph', text: '12 Ιουνίου 2027', style: { size: 18 } },
            ],
        },
        {
            ...blank,
            id: 's-blank-1',
            elements: [
                { id: 'b1-title', kind: 'text', role: 'title', text: 'Σας προσκαλούμε', style: { size: 34 } },
                {
                    id: 'b1-body',
                    kind: 'text',
                    role: 'paragraph',
                    text: 'Με χαρά σας προσκαλούμε στον γάμο μας.\nΘα χαρούμε πολύ να είστε μαζί μας.',
                    style: { size: 17, lineHeight: 1.7 },
                },
                { id: 'b1-leaf', kind: 'image', image: { source: 'theme', assetId: 'el-leaf' }, width: 180 },
                { id: 'b1-link', kind: 'link', text: 'Χάρτης', url: 'https://maps.google.com' },
            ],
        },
        {
            ...blank,
            id: 's-blank-2',
            style: { ...blank.style, background: { kind: 'color', color: '#2f2b2d' } },
            elements: [
                { id: 'b2-head', kind: 'text', role: 'title', text: 'Πρόγραμμα', fullWidth: true, style: { size: 34 } },
                { id: 'b2-left', kind: 'text', role: 'subtitle', text: 'Τελετή\n18:00', style: { size: 22 } },
                { id: 'b2-break', kind: 'columnBreak' },
                { id: 'b2-right', kind: 'text', role: 'subtitle', text: 'Δεξίωση\n21:00', style: { size: 22 } },
            ],
        },
        {
            ...blank,
            id: 's-blank-hidden',
            visible: false,
            elements: [{ id: 'hidden-text', kind: 'text', role: 'paragraph', text: 'Κρυφό', style: {} }],
        },
        {
            ...blank,
            id: 's-blank-3',
            elements: [
                { id: 'b3-text', kind: 'text', role: 'paragraph', text: 'Σας περιμένουμε!', style: { size: 20, italic: true } },
                { id: 'b3-space', kind: 'spacer', height: 24 },
            ],
        },
    ],
};
