import { useLocale } from 'next-intl';
import type { Globals } from 'storybook/internal/types';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS, type InvitationLabels } from '@/lib/invitation/labels';
import type { MediaResolver } from '@/lib/invitation/render';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection, SectionType } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { PREVIEW_THEME, previewDocument, previewMedia } from '@/lib/saveMyDatePreview';

// Shared data for the invitation renderer's stories, built from the samples
// the format tests and the staging preview already use.

type SectionOf<T extends SectionType> = Extract<InvitationSection, { type: T }>;
type SectionExtras<T extends SectionType> = Partial<Omit<SectionOf<T>, 'type' | 'data'>>;

export const STORY_THEME = PREVIEW_THEME;

// Every sample photo resolves to an image in public/images.
export const storyInvitationMedia: MediaResolver = (mediaId) => previewMedia(mediaId) ?? '/images/couple-hero.png';

export const LONG_TITLE = 'Με μεγάλη χαρά και αγάπη σας προσκαλούμε στη μεγάλη μας μέρα';
export const LONG_NAME = 'Αλεξάνδρα-Παναγιώτα Παπαδημητροπούλου';
export const LONG_TEXT =
    'Με μεγάλη χαρά σας προσκαλούμε να μοιραστείτε μαζί μας την πιο όμορφη μέρα της ζωής μας. Μετά την τελετή θα γιορτάσουμε όλοι μαζί με φαγητό, μουσική και χορό μέχρι το πρωί.\nΘα χαρούμε πολύ να σας δούμε εκεί.';

export const DARK_BACKGROUND = '#2f2b2d';

// The text sections of the staging preview sit on the plain content background,
// so their text is readable. The top section keeps its photo.
function onContentBackground<T extends InvitationSection>(section: T): T {
    if (section.type === 'top' || section.style.background.kind !== 'theme') return section;
    return { ...section, style: { ...section.style, background: { kind: 'theme', slot: 'content' } } };
}

// Effects move, so they stay out of these stories. Each effect has its own.
function withoutEffect<T extends InvitationSection>(section: T): T {
    return { ...section, style: { ...section.style, effect: undefined } };
}

// A sample section with some of its data replaced.
export function storySection<T extends SectionType>(type: T, data: Partial<SectionOf<T>['data']> = {}, extras: SectionExtras<T> = {}): SectionOf<T> {
    const sample = SAMPLE_SECTIONS[type] as unknown as SectionOf<T>;
    const section = { ...sample, data: { ...sample.data, ...data }, ...extras } as SectionOf<T>;
    return withoutEffect(extras.style ? section : onContentBackground(section));
}

// A dark, solid background: the theme's automatic contrast turns the text white.
export function onDark<T extends InvitationSection>(section: T): T {
    return { ...section, style: { ...section.style, background: { kind: 'color', color: DARK_BACKGROUND } } };
}

// The same section as the staging preview draws it.
export function previewSection<T extends SectionType>(type: T): SectionOf<T> {
    return previewDocument().sections.find((section) => section.type === type) as SectionOf<T>;
}

const PEOPLE = ['Γιώργος', 'Άννα', 'Κώστας', 'Δήμητρα', 'Νίκος', 'Ελένη'];

export function storyPeople(count: number, withPhotos = true) {
    return PEOPLE.slice(0, count).map((name, index) => ({
        id: `person-${index}`,
        name,
        ...(withPhotos ? { photo: { source: 'media' as const, mediaId: 'm-g1' } } : {}),
    }));
}

export const STORY_DECORATION = { image: { source: 'theme' as const, assetId: 'el-leaf' }, width: 180 };

export const ALL_CONTACT_LINKS = {
    phone: '6900000000',
    sms: '6900000000',
    email: 'maria@example.com',
    facebook: 'facebook.com/example',
    instagram: 'instagram.com/example',
    tiktok: 'tiktok.com/@example',
};

export const NO_CONTACT_LINKS = { phone: '', sms: '', email: '', facebook: '', instagram: '', tiktok: '' };

export function storyDocument(sections: InvitationSection[], overrides: InvitationDocument['overrides'] = {}): InvitationDocument {
    return { schemaVersion: previewDocument().schemaVersion, themeId: 'story', overrides, sections: sections.map(withoutEffect) };
}

// A hidden date section sets the invitation's language and the countdown's date.
export function hiddenDate(language: string, data: Partial<SectionOf<'date'>['data']> = {}): SectionOf<'date'> {
    const displayLanguage = language === 'en' ? 'en' : 'el';
    return { ...SAMPLE_SECTIONS.date, visible: false, data: { ...SAMPLE_SECTIONS.date.data, displayLanguage, ...data } };
}

const hiddenBlank = { ...SAMPLE_SECTIONS.blank, id: 's-story-lead', visible: false, elements: [] };

// The invitation's fixed labels in the language picked in the toolbar, which
// SectionStory also gives the invitation.
export function labelsFor(globals: Globals): InvitationLabels {
    return INVITATION_LABELS[globals.locale === 'en' ? 'en' : 'el'];
}

type SectionStoryProps = {
    section: InvitationSection;
    // What comes before the section. By default a hidden section, so every
    // story sits at the same position and shows the same background.
    before?: InvitationSection[];
    theme?: ThemeDesign;
    sendRsvp?: RsvpSender;
};

// One section drawn by the real renderer. Its fixed labels follow the toolbar's
// language; its host-written texts are sample data and stay as they are.
export function SectionStory({ section, before, theme = STORY_THEME, sendRsvp }: SectionStoryProps) {
    const locale = useLocale();
    const lead = before ?? [section.type === 'date' ? hiddenBlank : hiddenDate(locale)];

    return <InvitationRenderer document={storyDocument([...lead, section])} theme={theme} media={storyInvitationMedia} sendRsvp={sendRsvp} />;
}
