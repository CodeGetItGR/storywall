import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { CanvasTools } from '@/lib/invitation/canvasTools';
import type { DateLanguage } from '@/lib/invitation/dateDisplay';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { RsvpSender } from '@/lib/invitation/rsvp';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import { type InvitationSection, SECTION_TYPES, type SectionType } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import el from '@/messages/el.json';
import en from '@/messages/en.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

// jsdom has no ResizeObserver, and the gift section's IBAN box needs one.
vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
});

// It has no IntersectionObserver either, and sections with effects need one.
stubIntersectionObserver();

// Where each section type's story is, from this folder. The file must use
// storySection('<type>') from .storybook/invitation.tsx.
const SECTION_STORIES: Record<SectionType, string> = {
    top: 'sections/TopSection.stories.tsx',
    blank: 'sections/CustomSection.stories.tsx',
    photo: 'sections/media/PhotoSection.stories.tsx',
    gallery: 'sections/media/GallerySection.stories.tsx',
    photoFrame: 'sections/media/PhotoFrame.stories.tsx',
    invitation: 'sections/InvitationTextSection.stories.tsx',
    coupleNames: 'sections/CoupleNamesSection.stories.tsx',
    dressCode: 'sections/DressCodeSection.stories.tsx',
    footer: 'sections/FooterSection.stories.tsx',
    date: 'sections/date/DateSection.stories.tsx',
    countdown: 'sections/countdown/CountdownSection.stories.tsx',
    faq: 'sections/faq/FaqSection.stories.tsx',
    contact: 'sections/contact/ContactSection.stories.tsx',
    coupleContact: 'sections/contact/CoupleContactSection.stories.tsx',
    baby: 'sections/family/BabySection.stories.tsx',
    parents: 'sections/family/ParentsSection.stories.tsx',
    parentsSimple: 'sections/family/ParentsSimpleSection.stories.tsx',
    parentsPhoto: 'sections/family/ParentsPhotoSection.stories.tsx',
    godparents: 'sections/family/PhotoPeopleSection.stories.tsx',
    weddingSponsors: 'sections/family/PhotoPeopleSection.stories.tsx',
    weddingSponsorsSimple: 'sections/couple/WeddingSponsorsSimpleSection.stories.tsx',
    coupleProfiles: 'sections/couple/CoupleProfilesSection.stories.tsx',
    coupleProfilesSimple: 'sections/couple/CoupleProfilesSimpleSection.stories.tsx',
    ourStoryProposal: 'sections/couple/OurStoryProposalSection.stories.tsx',
    program: 'sections/info/ProgramSection.stories.tsx',
    programIcons: 'sections/info/ProgramIconsSection.stories.tsx',
    locations: 'sections/info/LocationsSection.stories.tsx',
    accommodation: 'sections/info/AccommodationSection.stories.tsx',
    gift: 'sections/info/GiftSection.stories.tsx',
    rsvp: 'sections/info/RsvpSection.stories.tsx',
};

const LANGUAGES: DateLanguage[] = ['el', 'en'];
const MESSAGES = { el, en };

const media = (mediaId: string) => `/images/${mediaId}.png`;

function documentIn(language: DateLanguage, sections: InvitationSection[] = SAMPLE_DOCUMENT.sections): InvitationDocument {
    return {
        ...SAMPLE_DOCUMENT,
        sections: sections.map((section) =>
            section.type === 'date' ? { ...section, data: { ...section.data, displayLanguage: language } } : section,
        ),
    };
}

type RenderOptions = { language?: DateLanguage; theme?: ThemeDesign; sendRsvp?: RsvpSender };

function renderInvitation(document: InvitationDocument, { language = 'el', theme = SAMPLE_THEME, sendRsvp }: RenderOptions = {}) {
    return render(
        <NextIntlClientProvider locale={language} messages={MESSAGES[language]} timeZone="Europe/Athens">
            <InvitationRenderer document={document} theme={theme} media={media} sendRsvp={sendRsvp} />
        </NextIntlClientProvider>,
    );
}

const renderedIds = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[data-section-id]')).map((section) => section.getAttribute('data-section-id'));

const altTexts = (container: HTMLElement) => Array.from(container.querySelectorAll('img')).map((image) => image.getAttribute('alt') ?? '');

afterEach(cleanup);

describe('InvitationRenderer with a full document', () => {
    it('draws every section in the order of the document', () => {
        const { container } = renderInvitation(SAMPLE_DOCUMENT);
        expect(renderedIds(container)).toEqual(SAMPLE_DOCUMENT.sections.map((section) => section.id));
    });

    it('follows the document when its sections move', () => {
        const reversed = { ...SAMPLE_DOCUMENT, sections: [...SAMPLE_DOCUMENT.sections].reverse() };
        const { container } = renderInvitation(reversed);
        expect(renderedIds(container)).toEqual(reversed.sections.map((section) => section.id));
    });

    it('keeps hidden sections out', () => {
        const sections = SAMPLE_DOCUMENT.sections.map((section, index) => ({ ...section, visible: index % 3 !== 0 }) as InvitationSection);
        const { container } = renderInvitation({ ...SAMPLE_DOCUMENT, sections });
        const hidden = sections.filter((section) => !section.visible).map((section) => section.id);

        expect(hidden.length).toBeGreaterThan(0);
        expect(renderedIds(container)).toEqual(sections.filter((section) => section.visible).map((section) => section.id));
    });

    it('takes its language from the date section, even a hidden one', () => {
        const sections = [{ ...SAMPLE_SECTIONS.date, visible: false }, SAMPLE_SECTIONS.parents];
        const { container } = renderInvitation(documentIn('en', sections));

        expect(container.querySelector('[lang]')?.getAttribute('lang')).toBe('en');
        expect(screen.getByText(INVITATION_LABELS.en.parents)).toBeTruthy();
    });
});

describe.each(LANGUAGES)('Invitation images in %s', (language) => {
    const icon = { image: { mediaId: 'm-icon' }, scale: 1, animation: 'none' as const };
    const themeWithArt: ThemeDesign = { ...SAMPLE_THEME, art: { ...SAMPLE_THEME.art, ceremonyIcon: icon, welcomeIcon: icon, receptionIcon: icon } };
    const customIcon = { kind: 'custom' as const, image: { source: 'media' as const, mediaId: 'm-icon' }, mode: 'image' as const, name: '' };

    it('all have alt text', () => {
        const { container } = renderInvitation(documentIn(language), { language, theme: themeWithArt });
        const alts = altTexts(container);

        expect(alts.length).toBeGreaterThan(5);
        expect(alts.filter((alt) => !alt.trim())).toEqual([]);
        expect(alts).toContain(MESSAGES[language].InvitationRenderer.mainArtAlt);
    });

    it('fall back to a real description when the host left the names empty', () => {
        const sections: InvitationSection[] = [
            SAMPLE_SECTIONS.date,
            { ...SAMPLE_SECTIONS.baby, data: { ...SAMPLE_SECTIONS.baby.data, babyName: ' ' } },
            { ...SAMPLE_SECTIONS.godparents, data: { ...SAMPLE_SECTIONS.godparents.data, godparents: [{ id: 'g1', name: '', photo: { source: 'media', mediaId: 'm-g1' } }] }, textStyles: {} },
            { ...SAMPLE_SECTIONS.locations, data: { ...SAMPLE_SECTIONS.locations.data, ceremony: '', reception: '' } },
            { ...SAMPLE_SECTIONS.programIcons, data: { ...SAMPLE_SECTIONS.programIcons.data, items: [{ id: 'p1', time: '', label: '', description: '', icon: customIcon }] }, textStyles: {} },
            { ...SAMPLE_SECTIONS.blank, elements: [{ id: 'e-missing', kind: 'image', image: { source: 'media', mediaId: 'm-image' }, width: 200 }] },
        ];
        const { container } = renderInvitation(documentIn(language, sections), { language, theme: themeWithArt });
        const alts = altTexts(container);

        expect(alts.filter((alt) => !alt.trim())).toEqual([]);
        expect(alts).toContain(INVITATION_LABELS[language].photoAlt);
        expect(alts).toContain(MESSAGES[language].InvitationRenderer.imageAlt);
    });
});

describe('RSVP through the whole invitation', () => {
    const labels = INVITATION_LABELS.el;

    function rsvpForm(container: HTMLElement) {
        return within(container.querySelector<HTMLElement>(`[data-section-id="${SAMPLE_SECTIONS.rsvp.id}"]`) as HTMLElement);
    }

    function fillIn(form: ReturnType<typeof rsvpForm>) {
        fireEvent.change(form.getByLabelText(labels.rsvpName), { target: { value: 'Μαρία' } });
        fireEvent.change(form.getByLabelText(labels.rsvpPhone), { target: { value: '6900000000' } });
        fireEvent.change(form.getByLabelText(labels.rsvpEmail), { target: { value: 'maria@example.com' } });
        fireEvent.change(form.getByLabelText(labels.rsvpNotes), { target: { value: 'Χωρίς γλουτένη' } });
    }

    it('sends the reply and thanks the guest', async () => {
        const sendRsvp = vi.fn<RsvpSender>().mockResolvedValue({ ok: true });
        const { container } = renderInvitation(SAMPLE_DOCUMENT, { sendRsvp });
        const form = rsvpForm(container);

        fillIn(form);
        fireEvent.change(form.getByLabelText(labels.rsvpAdults), { target: { value: '3' } });
        fireEvent.change(form.getByLabelText(labels.rsvpChildren), { target: { value: '0' } });
        fireEvent.click(form.getByRole('button', { name: labels.rsvpSubmit }));

        await form.findByText(labels.rsvpThanks);
        expect(sendRsvp).toHaveBeenCalledTimes(1);
        expect(sendRsvp).toHaveBeenCalledWith({
            guestName: 'Μαρία',
            attendanceStatus: 'ATTENDING',
            phone: '6900000000',
            email: 'maria@example.com',
            adultCount: 3,
            childCount: 0,
            notes: 'Χωρίς γλουτένη',
            website: '',
        });
        expect(form.queryByRole('button', { name: labels.rsvpSubmit })).toBeNull();
    });

    it('sends no headcount when the guest declines', async () => {
        const sendRsvp = vi.fn<RsvpSender>().mockResolvedValue({ ok: true });
        const { container } = renderInvitation(SAMPLE_DOCUMENT, { sendRsvp });
        const form = rsvpForm(container);

        fillIn(form);
        fireEvent.click(form.getByLabelText(labels.rsvpNo));
        fireEvent.click(form.getByRole('button', { name: labels.rsvpSubmit }));

        await form.findByText(labels.rsvpThanks);
        await waitFor(() => expect(sendRsvp).toHaveBeenCalledWith(expect.objectContaining({ attendanceStatus: 'DECLINED', adultCount: 0, childCount: 0 })));
    });
});

describe('Section coverage', () => {
    it.each(SECTION_TYPES)('%s is drawn', (type) => {
        const section = SAMPLE_SECTIONS[type] as InvitationSection;
        const { container } = renderInvitation({ ...SAMPLE_DOCUMENT, sections: [section] });
        expect(renderedIds(container)).toEqual([section.id]);
    });

    it.each(Object.entries(SECTION_STORIES))('%s has a story', (type, file) => {
        const path = join(process.cwd(), 'components/saveMyDate/invitation', file);
        expect(existsSync(path), `${file} does not exist`).toBe(true);
        expect(readFileSync(path, 'utf8')).toContain(`storySection('${type}'`);
    });
});

// Stands in for the editor's tools around a section.
function wrapForTest(section: InvitationSection, index: number, content: ReactNode) {
    return (
        <div data-wrapped={section.id} data-index={index}>
            {content}
        </div>
    );
}

describe('InvitationRenderer in the editor', () => {
    it('draws hidden sections when asked, and wraps each one', () => {
        const sections = SAMPLE_DOCUMENT.sections.map((section, index) => (index === 1 ? { ...section, visible: false } : section));
        const { container } = render(
            <NextIntlClientProvider locale="el" messages={el} timeZone="Europe/Athens">
                <InvitationRenderer
                    document={{ ...SAMPLE_DOCUMENT, sections }}
                    theme={SAMPLE_THEME}
                    media={media}
                    showHidden
                    wrapSection={wrapForTest}
                />
            </NextIntlClientProvider>,
        );

        expect(renderedIds(container)).toEqual(sections.map((section) => section.id));
        const wrapped = Array.from(container.querySelectorAll('[data-wrapped]'));
        expect(wrapped.map((element) => element.getAttribute('data-wrapped'))).toEqual(sections.map((section) => section.id));
        expect(wrapped.map((element) => Number(element.getAttribute('data-index')))).toEqual(sections.map((_, index) => index));
    });
});

// Marks where the editor's handles and arrows would go.
const markTools: CanvasTools = {
    element: (element) => <span data-tool-element={element.id} />,
    decoration: (sectionId) => <span data-tool-decoration={sectionId} />,
    customItem: (sectionId, _elements, item, content) => (
        <div data-tool-item={item.id} data-tool-section={sectionId}>
            {content}
        </div>
    ),
    columnBreak: (sectionId, _elements, breakId) => <span data-tool-break={breakId} data-tool-section={sectionId} />,
    savedHeights: true,
};

function renderWithTools(document: InvitationDocument, canvasTools?: CanvasTools) {
    return render(
        <NextIntlClientProvider locale="el" messages={el} timeZone="Europe/Athens">
            <InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} canvasTools={canvasTools} />
        </NextIntlClientProvider>,
    );
}

const marked = (container: HTMLElement, attribute: string) =>
    Array.from(container.querySelectorAll(`[${attribute}]`)).map((element) => element.getAttribute(attribute));

const sectionNode = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`[data-section-id="${id}"]`)!;

describe('InvitationRenderer canvas tools', () => {
    const saved = { minHeight: 500, paddingY: 60 };
    const withSavedHeights: InvitationDocument = {
        ...SAMPLE_DOCUMENT,
        sections: SAMPLE_DOCUMENT.sections.map((section) =>
            section.type === 'blank' || section.type === 'footer' ? { ...section, style: { ...section.style, ...saved } } : section,
        ),
    };
    const blank = SAMPLE_SECTIONS.blank;

    it('leaves a place for each handle and arrow', () => {
        const { container } = renderWithTools(SAMPLE_DOCUMENT, markTools);
        expect(marked(container, 'data-tool-element')).toEqual(expect.arrayContaining(['e-b-img', 'e-b-gap', 'e-frame']));
        expect(marked(container, 'data-tool-decoration')).toEqual([SAMPLE_SECTIONS.parentsSimple.id]);
        // Every custom section item but the break gets its arrows, in order.
        expect(marked(container, 'data-tool-item')).toEqual(
            blank.elements.filter((element) => element.kind !== 'columnBreak').map((element) => element.id),
        );
        expect(marked(container, 'data-tool-break')).toEqual(['e-b-break']);
        expect(container.querySelector('[data-tool-break]')).toHaveAttribute('data-tool-section', blank.id);
    });

    it('shows every saved height in the editor', () => {
        const { container } = renderWithTools(withSavedHeights, markTools);
        expect(sectionNode(container, blank.id)).toHaveStyle({ minHeight: '500px', paddingTop: '60px', paddingBottom: '60px' });
    });

    it('gives guests no tools, and saved heights only where they are part of the design', () => {
        const { container } = renderWithTools(withSavedHeights);
        for (const attribute of ['data-tool-element', 'data-tool-decoration', 'data-tool-item', 'data-tool-break']) {
            expect(marked(container, attribute)).toEqual([]);
        }
        expect(sectionNode(container, blank.id).style.minHeight).toBe('');
        expect(sectionNode(container, blank.id).style.paddingTop).toBe('');
        expect(sectionNode(container, SAMPLE_SECTIONS.footer.id)).toHaveStyle({ minHeight: '500px' });
        expect(sectionNode(container, SAMPLE_SECTIONS.photo.id)).toHaveStyle({ minHeight: '420px' });
    });
});
