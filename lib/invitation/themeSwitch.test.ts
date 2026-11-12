import { describe, expect, it } from 'vitest';

import { INVITATION_SCHEMA_VERSION, type InvitationDocument, invitationDocumentSchema } from '@/lib/invitation/document';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { planThemeSwitch, themeImageIds, type ThemeSwitchTarget } from '@/lib/invitation/themeSwitch';

// The old theme is SAMPLE_THEME with its sample photos; the new one has its own look and images.
const OLD_IMAGES = new Set(['m-baby', 'm-photo', 'm-a', 'm-framed', 'm-leaf', 'm-1', 'm-2']);

const NEW_THEME: ThemeDesign = {
    ...SAMPLE_THEME,
    colors: { primary: '#123456', secondary: '#abcdef', text: '#111111' },
    elements: [{ id: 'el-rose', name: 'Τριαντάφυλλο', image: { mediaId: 'n-rose' } }],
    frames: [{ id: 'fr-arch', name: 'Αψίδα', art: { mediaId: 'n-arch' }, mask: { mediaId: 'n-arch-mask' }, width: 900, height: 1200 }],
    transitions: [],
};

const NEW_STYLE: SectionStyle = {
    background: { kind: 'color', color: '#abcdef' },
    hostBackgrounds: { enabled: false, allowed: [] },
    textContrast: 'light',
};

function doc(sections: InvitationSection[], themeId = 'theme-1', overrides: InvitationDocument['overrides'] = {}): InvitationDocument {
    return { schemaVersion: INVITATION_SCHEMA_VERSION, themeId, overrides, sections };
}

function newSection<T extends InvitationSection>(section: T, changes: Partial<InvitationSection> = {}): T {
    return { ...section, id: `n-${section.id}`, style: NEW_STYLE, ...changes } as T;
}

function target(sections: InvitationSection[]): ThemeSwitchTarget {
    return { document: doc(sections, 'theme-2'), theme: NEW_THEME, imageIds: new Set(['n-rose', 'n-arch', 'n-arch-mask', 'n-photo']) };
}

const NEW_TEMPLATE = target([
    newSection(SAMPLE_SECTIONS.top),
    newSection(SAMPLE_SECTIONS.invitation, { data: { text: 'Κείμενο του νέου θέματος' }, textStyles: { text: { size: 30, color: '#111111' } } }),
    newSection(SAMPLE_SECTIONS.date, { data: { ...SAMPLE_SECTIONS.date.data, displayStyle: 'calendar', day: 'Δευτέρα' } }),
    newSection(SAMPLE_SECTIONS.photo, { data: { photo: { source: 'media', mediaId: 'n-photo' }, imageY: 10 } }),
    newSection(SAMPLE_SECTIONS.footer, { locked: true }),
]);

function section(plan: ReturnType<typeof planThemeSwitch>, id: string) {
    return plan.document.sections.find((item) => item.id === id)!;
}

describe('planThemeSwitch', () => {
    it("keeps the host's content and takes the new theme's look", () => {
        const host = doc([
            SAMPLE_SECTIONS.top,
            { ...SAMPLE_SECTIONS.invitation, data: { text: 'Το δικό μας κείμενο' }, textStyles: { text: { size: 12 } } },
            SAMPLE_SECTIONS.date,
            SAMPLE_SECTIONS.footer,
        ]);

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.document.themeId).toBe('theme-2');
        const invitation = section(plan, 's-invitation');
        expect(invitation.data).toEqual({ text: 'Το δικό μας κείμενο' });
        expect(invitation.textStyles).toEqual({ text: { size: 30, color: '#111111' } });
        expect(invitation.style).toEqual(NEW_STYLE);
        const date = section(plan, 's-date');
        expect(date.data).toMatchObject({ iso: SAMPLE_SECTIONS.date.data.iso, day: SAMPLE_SECTIONS.date.data.day, displayStyle: 'calendar' });
        expect(plan.document.sections.map((item) => item.id)).toEqual(['s-top', 's-invitation', 's-date', 's-footer']);
        expect(plan.hidden).toEqual([]);
        expect(() => invitationDocumentSchema.parse(plan.document)).not.toThrow();
    });

    it("hides the host's sections the new theme has no kind for, without deleting them", () => {
        const host = doc([SAMPLE_SECTIONS.top, SAMPLE_SECTIONS.gift, SAMPLE_SECTIONS.faq, SAMPLE_SECTIONS.footer]);

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.hidden).toEqual([
            { id: 's-gift', type: 'gift' },
            { id: 's-faq', type: 'faq' },
        ]);
        expect(section(plan, 's-gift')).toMatchObject({ visible: false, hiddenByTheme: true, data: SAMPLE_SECTIONS.gift.data });
        expect(section(plan, 's-faq').data).toEqual(SAMPLE_SECTIONS.faq.data);
    });

    it('leaves out the sections only the new theme has', () => {
        const plan = planThemeSwitch(doc([SAMPLE_SECTIONS.invitation, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.document.sections.map((item) => item.type)).toEqual(['invitation', 'footer']);
    });

    it('shows a section again when switching back to a theme that has it', () => {
        const host = doc([SAMPLE_SECTIONS.top, SAMPLE_SECTIONS.gift, SAMPLE_SECTIONS.footer]);
        const away = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        const back = planThemeSwitch(
            away.document,
            { document: doc([SAMPLE_SECTIONS.top, SAMPLE_SECTIONS.gift, SAMPLE_SECTIONS.footer]), theme: SAMPLE_THEME, imageIds: OLD_IMAGES },
            NEW_TEMPLATE.imageIds,
        );

        expect(back.restored).toEqual([{ id: 's-gift', type: 'gift' }]);
        expect(section(back, 's-gift')).toMatchObject({ visible: true, data: SAMPLE_SECTIONS.gift.data });
        expect(section(back, 's-gift')).not.toHaveProperty('hiddenByTheme');
    });

    it('keeps a section the host had hidden hidden, and does not list it', () => {
        const host = doc([{ ...SAMPLE_SECTIONS.gift, visible: false }, SAMPLE_SECTIONS.footer]);

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.hidden).toEqual([]);
        expect(section(plan, 's-gift')).not.toHaveProperty('hiddenByTheme');
    });

    it("swaps the old theme's sample photo for the new theme's, and keeps the host's own photo", () => {
        const sample = planThemeSwitch(doc([SAMPLE_SECTIONS.photo, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);
        expect(section(sample, 's-photo').data).toEqual({ photo: { source: 'media', mediaId: 'n-photo' }, imageY: 50 });

        const own = { ...SAMPLE_SECTIONS.photo, data: { photo: { source: 'media' as const, mediaId: 'upload-1' }, imageY: 30 } };
        const kept = planThemeSwitch(doc([own, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);
        expect(section(kept, 's-photo').data).toEqual(own.data);
    });

    it("drops the old theme's sample photos the new theme has no place for", () => {
        const plan = planThemeSwitch(doc([SAMPLE_SECTIONS.baby, SAMPLE_SECTIONS.gallery, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);

        expect(section(plan, 's-baby').data).not.toHaveProperty('babyPhoto');
        expect(section(plan, 's-gallery').data).toMatchObject({ images: [] });
        expect(() => invitationDocumentSchema.parse(plan.document)).not.toThrow();
    });

    it("replaces the old theme's decorations and frames with the new theme's", () => {
        const template = target([
            newSection(SAMPLE_SECTIONS.blank, {
                elements: [
                    { id: 'n-title', kind: 'text', role: 'title', text: 'Νέος τίτλος', style: { size: 50 } },
                    { id: 'n-rose', kind: 'image', image: { source: 'theme', assetId: 'el-rose' }, width: 120 },
                ],
            }),
            newSection(SAMPLE_SECTIONS.photoFrame, {
                elements: [
                    {
                        ...SAMPLE_SECTIONS.photoFrame.elements[0],
                        id: 'n-frame',
                        frameId: 'fr-arch',
                    } as (typeof SAMPLE_SECTIONS.photoFrame.elements)[number],
                ],
            }),
            newSection(SAMPLE_SECTIONS.footer, { locked: true }),
        ]);
        const host = doc([SAMPLE_SECTIONS.blank, SAMPLE_SECTIONS.photoFrame, SAMPLE_SECTIONS.footer]);

        const plan = planThemeSwitch(host, template, OLD_IMAGES);

        const blank = section(plan, 's-blank');
        expect(blank.elements.map((element) => element.id)).toEqual(['e-b-title', 'n-rose', 'e-b-left', 'e-b-break', 'e-b-gap', 'e-b-link']);
        expect(blank.elements[0]).toMatchObject({ text: 'Τίτλος', style: { size: 50 } });
        const frame = section(plan, 's-photoFrame').elements[0];
        expect(frame).toMatchObject({ frameId: 'fr-arch', animation: 'fade-in' });
        expect(frame).not.toHaveProperty('photo');
        expect(section(plan, 's-photoFrame').style.transition).toBeUndefined();
        expect(() => invitationDocumentSchema.parse(plan.document)).not.toThrow();
    });

    it("strips the old theme's images from a hidden section, so publishing still passes", () => {
        const host = doc([
            {
                ...SAMPLE_SECTIONS.photoFrame,
                style: { ...SAMPLE_SECTIONS.photoFrame.style, background: { kind: 'image', image: { source: 'theme', assetId: 'el-leaf' } } },
            },
            SAMPLE_SECTIONS.footer,
        ]);

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        const hidden = section(plan, 's-photoFrame');
        expect(hidden.visible).toBe(false);
        expect(hidden.style.transition).toBeUndefined();
        expect(hidden.style.background).toEqual({ kind: 'theme', slot: 'auto' });
        expect(hidden.elements[0]).toMatchObject({ frameId: '' });
    });

    it('gives a custom program icon of the old theme back to the label picker', () => {
        const programIcons = {
            ...SAMPLE_SECTIONS.programIcons,
            data: {
                ...SAMPLE_SECTIONS.programIcons.data,
                items: SAMPLE_SECTIONS.programIcons.data.items.map((item) => ({
                    ...item,
                    icon: { kind: 'custom' as const, image: { source: 'theme' as const, assetId: 'el-leaf' }, mode: 'image' as const, name: 'Φύλλο' },
                })),
            },
        };

        const plan = planThemeSwitch(doc([programIcons, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);

        const items = (section(plan, 's-programIcons').data as { items: { icon: unknown }[] }).items;
        expect(items.every((item) => (item.icon as { kind: string }).kind === 'auto')).toBe(true);
    });

    it('resets the text colour and font set, and says so', () => {
        const host = doc([SAMPLE_SECTIONS.invitation, SAMPLE_SECTIONS.footer], 'theme-1', { textColor: '#ff0000' });

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.document.overrides).toEqual({});
        expect(plan.resetsTextLook).toBe(true);
        expect(planThemeSwitch(doc([SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES).resetsTextLook).toBe(false);
    });

    it('pairs sections that may repeat in order, and gives extra ones the last look', () => {
        const host = doc([SAMPLE_SECTIONS.photo, { ...SAMPLE_SECTIONS.photo, id: 's-photo-2' }, SAMPLE_SECTIONS.footer]);

        const plan = planThemeSwitch(host, NEW_TEMPLATE, OLD_IMAGES);

        expect(section(plan, 's-photo').style).toEqual(NEW_STYLE);
        expect(section(plan, 's-photo-2').style).toEqual(NEW_STYLE);
        expect(plan.hidden).toEqual([]);
    });

    it('keeps the footer locked and last', () => {
        const plan = planThemeSwitch(doc([SAMPLE_SECTIONS.invitation, SAMPLE_SECTIONS.footer]), NEW_TEMPLATE, OLD_IMAGES);

        expect(plan.document.sections.at(-1)).toMatchObject({ type: 'footer', locked: true });
    });
});

describe('themeImageIds', () => {
    it('is the ids a theme answer lists images for', () => {
        expect(themeImageIds({ a: 'https://x/a', b: 'https://x/b' })).toEqual(new Set(['a', 'b']));
        expect(themeImageIds(undefined)).toEqual(new Set());
    });
});
