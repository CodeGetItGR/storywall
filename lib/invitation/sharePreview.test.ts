import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import type { PublishedInvitation } from '@/lib/invitation/publishedInvitation';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { invitationShareDetails, invitationShareImages, invitationShareTitle } from '@/lib/invitation/sharePreview';

const text = (id: string, role: 'title' | 'subtitle' | 'paragraph', value: string): InvitationElement => ({
    id,
    kind: 'text',
    role,
    text: value,
    style: {},
});

const frame = (id: string, mediaId: string): InvitationElement => ({
    id,
    kind: 'photoFrame',
    frameId: 'fr-oval',
    photo: { source: 'media', mediaId },
    imageX: 30,
    imageY: 70,
    zoom: 1,
    boxScale: 1,
    imageWidth: 0,
    imageHeight: 0,
    animation: 'none',
});

// The couple's names as the real wedding themes lay them out: a photo, then name, "&", name.
const COUPLE_TOP: InvitationElement[] = [
    frame('e-photo', 'm-couple'),
    text('e-a', 'title', 'Άγγελος'),
    text('e-and', 'paragraph', '&'),
    text('e-b', 'title', 'Αλεξάνδρα'),
];

function withSection(type: InvitationSection['type'], change: (section: InvitationSection) => InvitationSection | null): InvitationDocument {
    const sections = SAMPLE_DOCUMENT.sections.flatMap((section) => {
        if (section.type !== type) return [section];
        const next = change(section);
        return next ? [next] : [];
    });
    return { ...SAMPLE_DOCUMENT, sections };
}

const withTop = (elements: InvitationElement[], extra: Partial<InvitationSection> = {}) =>
    withSection('top', (section) => ({ ...section, elements, ...extra }) as InvitationSection);

const MEDIA: Record<string, string> = { 'm-couple': 'https://r2/couple.webp', 'm-top': 'https://r2/top.webp', 'm-top-mobile': 'https://r2/top-m.webp' };

function invitation(document: InvitationDocument, theme = SAMPLE_THEME, media = MEDIA): PublishedInvitation {
    return { document, theme, media: (id) => media[id] };
}

describe('invitationShareTitle', () => {
    it("reads the top section's text in order, on one line", () => {
        expect(invitationShareTitle(withTop(COUPLE_TOP))).toBe('Άγγελος & Αλεξάνδρα');
        expect(invitationShareTitle(withTop([text('e1', 'title', '  Μαρία\nκαι\tΝίκος ')]))).toBe('Μαρία και Νίκος');
    });

    it('is a single name for a baptism', () => {
        expect(invitationShareTitle(withTop([text('e1', 'title', 'Αφροδίτη')]))).toBe('Αφροδίτη');
    });

    it('is null when the top section has no text, is hidden or is missing', () => {
        expect(invitationShareTitle(SAMPLE_DOCUMENT)).toBeNull();
        expect(invitationShareTitle(withTop([text('e1', 'title', '   ')]))).toBeNull();
        expect(invitationShareTitle(withTop(COUPLE_TOP, { visible: false }))).toBeNull();
        expect(invitationShareTitle(withSection('top', () => null))).toBeNull();
    });

    it('shortens a long top text', () => {
        const title = invitationShareTitle(withTop([text('e1', 'paragraph', 'λέξη '.repeat(60))]));
        expect(title).toHaveLength(100);
        expect(title?.endsWith('…')).toBe(true);
    });
});

describe('invitationShareDetails', () => {
    it('writes the date, time and ceremony in Greek', () => {
        expect(invitationShareDetails(SAMPLE_DOCUMENT)).toBe('Κυριακή 12 Ιουλίου 2026 · 18:00 · Ιερός Ναός Αγίου Νικολάου');
    });

    it("writes them in English when that's the invitation's language", () => {
        const document = withSection('date', (section) =>
            section.type === 'date' ? { ...section, data: { ...section.data, displayLanguage: 'en', iso: '2027-08-29T19:30' } } : section,
        );
        expect(invitationShareDetails(document)).toBe('Sunday, 29 August 2027 · 19:30 · Ιερός Ναός Αγίου Νικολάου');
    });

    it('joins a place typed on several lines and falls back to the reception', () => {
        const ceremony = withSection('locations', (section) =>
            section.type === 'locations' ? { ...section, data: { ...section.data, ceremony: 'Ιερός Ναός\nΚοιμήσεως Της Θεοτόκου' } } : section,
        );
        expect(invitationShareDetails(ceremony)).toBe('Κυριακή 12 Ιουλίου 2026 · 18:00 · Ιερός Ναός Κοιμήσεως Της Θεοτόκου');
        const reception = withSection('locations', (section) =>
            section.type === 'locations' ? { ...section, data: { ...section.data, ceremony: ' ', reception: 'Κτήμα\n"Αύρα"' } } : section,
        );
        expect(invitationShareDetails(reception)).toBe('Κυριακή 12 Ιουλίου 2026 · 18:00 · Κτήμα "Αύρα"');
    });

    it('leaves out what the invitation does not show', () => {
        const noPlace = withSection('locations', () => null);
        expect(invitationShareDetails(noPlace)).toBe('Κυριακή 12 Ιουλίου 2026 · 18:00');
        const hiddenDate = withSection('date', (section) => ({ ...section, visible: false }));
        expect(invitationShareDetails(hiddenDate)).toBe('Ιερός Ναός Αγίου Νικολάου');
    });

    it('is null with neither a date nor a place', () => {
        const document = { ...SAMPLE_DOCUMENT, sections: SAMPLE_DOCUMENT.sections.filter((section) => section.type !== 'date' && section.type !== 'locations') };
        expect(invitationShareDetails(document)).toBeNull();
    });
});

describe('invitationShareImages', () => {
    const card = { kind: 'card', text: 'Άγγελος & Αλεξάνδρα', background: '#efe7ec', color: '#2f2b2d', accent: '#b8dfd3' };

    it("tries the top section's photo first, then the top background, then the card", () => {
        expect(invitationShareImages(invitation(withTop(COUPLE_TOP)), 'Άγγελος & Αλεξάνδρα')).toEqual([
            { kind: 'photo', url: 'https://r2/couple.webp' },
            { kind: 'photo', url: 'https://r2/top.webp' },
            card,
        ]);
    });

    it("uses the top background when there's no photo, as on the baptism themes", () => {
        expect(invitationShareImages(invitation(withTop([text('e1', 'title', 'Αφροδίτη')])), 'Αφροδίτη')[0]).toEqual({
            kind: 'photo',
            url: 'https://r2/top.webp',
        });
    });

    it('draws the card in the theme colours, with the host text colour, when there is no picture at all', () => {
        const theme = { ...SAMPLE_THEME, backgrounds: { ...SAMPLE_THEME.backgrounds, top: { mode: 'cover' as const, stableRepeat: false } } };
        const document = { ...withTop([]), overrides: { textColor: '#703c77' } };
        expect(invitationShareImages(invitation(document, theme), 'Πρόσκληση')).toEqual([{ ...card, text: 'Πρόσκληση', color: '#703c77' }]);
    });

    it("skips a photo whose image the backend didn't send", () => {
        const images = invitationShareImages(invitation(withTop(COUPLE_TOP), SAMPLE_THEME, { 'm-top': 'https://r2/top.webp' }), 'x');
        expect(images.map((image) => image.kind === 'photo' && image.url)).toEqual(['https://r2/top.webp', false]);
    });

    it('ignores a hidden top section', () => {
        expect(invitationShareImages(invitation(withTop(COUPLE_TOP, { visible: false })), 'x')).toHaveLength(1);
    });
});
