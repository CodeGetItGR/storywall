import type { InvitationDocument } from '@/lib/invitation/document';
import { invitationLanguage } from '@/lib/invitation/labels';
import type { PublishedInvitation } from '@/lib/invitation/publishedInvitation';
import { buildRenderContext, resolveImage, sectionBackgroundPhotos } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

// What a shared invitation link shows in Viber, WhatsApp, Messenger and the rest: its title (the top
// section's text), a line with the date, time and place, and a picture. All of it is the host's own
// content, in the invitation's language.

// The longest title a link preview gets; longer top texts end in an ellipsis.
const MAX_TITLE_LENGTH = 100;

// The picture: a photo to crop to the preview's shape, or a card drawn in the theme's colours.
export type InvitationShareImage =
    | { kind: 'photo'; url: string }
    | { kind: 'card'; text: string; background: string; color: string; accent: string };

type TopSection = Extract<InvitationSection, { type: 'top' }>;

function oneLine(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function topSection(document: InvitationDocument): { section: TopSection; index: number } | null {
    const index = document.sections.findIndex((section) => section.type === 'top' && section.visible);
    return index < 0 ? null : { section: document.sections[index] as TopSection, index };
}

// The top section's text in reading order, e.g. "Άγγελος & Αλεξάνδρα". Null when it has none.
export function invitationShareTitle(document: InvitationDocument): string | null {
    const top = topSection(document);
    if (!top) return null;
    const text = oneLine(
        top.section.elements
            .map((element) => (element.kind === 'text' ? element.text : ''))
            .join(' '),
    );
    if (!text) return null;
    return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…` : text;
}

// The date section's date and time, written out in the invitation's language
// ("Κυριακή 29 Αυγούστου 2027 · 19:30"). The stored time has no zone: it is the host's own clock.
function shareDate(document: InvitationDocument): string[] {
    const section = document.sections.find((candidate) => candidate.type === 'date' && candidate.visible);
    if (section?.type !== 'date') return [];
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(section.data.iso);
    if (!match) return [];
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (Number.isNaN(date.getTime())) return [];
    const locale = invitationLanguage(document) === 'en' ? 'en-GB' : 'el';
    const longDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return [longDate.format(date), `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`];
}

// The ceremony, or the reception when there is no ceremony, as the host typed it.
function sharePlace(document: InvitationDocument): string[] {
    const section = document.sections.find((candidate) => candidate.type === 'locations' && candidate.visible);
    if (section?.type !== 'locations') return [];
    const place = oneLine(section.data.ceremony) || oneLine(section.data.reception);
    return place ? [place] : [];
}

// "Κυριακή 29 Αυγούστου 2027 · 19:30 · Ιερός Ναός Κοιμήσεως Της Θεοτόκου", leaving out what the
// invitation doesn't have. Null when it has neither a date nor a place.
export function invitationShareDetails(document: InvitationDocument): string | null {
    const parts = [...shareDate(document), ...sharePlace(document)];
    return parts.length > 0 ? parts.join(' · ') : null;
}

// The pictures to try, best first: the top section's photo, then its background, then the card,
// which always works. `cardText` is what the card shows: the title, or the plain fallback.
export function invitationShareImages(invitation: PublishedInvitation, cardText: string): InvitationShareImage[] {
    const ctx = buildRenderContext(invitation.document, invitation.theme, invitation.media);
    const top = topSection(invitation.document);
    const images: InvitationShareImage[] = [];
    if (top) {
        for (const element of top.section.elements) {
            if (element.kind !== 'photoFrame') continue;
            const url = resolveImage(element.photo, ctx);
            if (url) images.push({ kind: 'photo', url });
        }
        const background = sectionBackgroundPhotos(top.section, top.index, ctx);
        if (background) images.push({ kind: 'photo', url: background.desktop });
    }
    const { colors } = invitation.theme;
    images.push({ kind: 'card', text: cardText, background: colors.secondary, color: ctx.textColor, accent: colors.primary });
    return images;
}
