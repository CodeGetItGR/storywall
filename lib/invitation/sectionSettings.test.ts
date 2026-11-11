import { describe, expect, it } from 'vitest';

import { applyDateLanguage } from '@/lib/invitation/dateDisplay';
import { type InvitationDocument, invitationDocumentSchema } from '@/lib/invitation/document';
import { documentLink } from '@/lib/invitation/documentLink';
import { createInvitationEditorStore } from '@/lib/invitation/editorStore';
import { customProgramIcon, iconUploadProblem, svgRasterSize } from '@/lib/invitation/programIconUpload';
import { SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import {
    hostBackgroundSlots,
    setBackgroundEffect,
    setHostBackgroundAllowed,
    setHostBackgroundsEnabled,
    setSectionTransition,
    setThemeBackground,
} from '@/lib/invitation/sectionBackgrounds';
import type { InvitationSection } from '@/lib/invitation/sections';
import { type DocumentRecipe, patchStyle, settingMergeKey, settingsGroups } from '@/lib/invitation/sectionSettings';
import {
    addDressCodeColor,
    addProgramItem,
    deleteProgramItem,
    MAX_DRESS_CODE_COLORS,
    patchFooter,
    patchSectionStyle,
    removeDressCodeColor,
    setContactLink,
    setDateLanguage,
    setDateLayout,
    setLinkButton,
    setLocationMap,
    setPartnerContactLink,
    setStayLinks,
    updateProgramItem,
} from '@/lib/invitation/sectionSettingsEdits';
import { programStyleView, readStyleNumber, upgradeProgramStyle, visibleStyleGroups } from '@/lib/invitation/sectionStyleFields';
import { COUNTDOWN_FIELDS } from '@/lib/invitation/sectionStyleFields';

function documentWith(...sections: InvitationSection[]): InvitationDocument {
    return { schemaVersion: 1, themeId: 't1', overrides: {}, sections };
}

// Applies one recipe and checks the result is still a valid document.
function run(document: InvitationDocument, recipe: DocumentRecipe): InvitationDocument {
    const store = createInvitationEditorStore(document);
    store.getState().edit(recipe);
    const next = store.getState().document;
    expect(invitationDocumentSchema.safeParse(next).success).toBe(true);
    return next;
}

function sectionOf<T extends InvitationSection['type']>(document: InvitationDocument, type: T) {
    return document.sections.find((section) => section.type === type) as Extract<InvitationSection, { type: T }>;
}

describe('settingsGroups', () => {
    it('gives each type its own groups, then the background for admins', () => {
        expect(settingsGroups(SAMPLE_SECTIONS.program, 'admin', SAMPLE_THEME)).toEqual([
            'programItems',
            'programStyle',
            'background',
            'effect',
            'transition',
        ]);
        expect(settingsGroups(SAMPLE_SECTIONS.faq, 'admin', SAMPLE_THEME)).toEqual(['faq', 'background', 'effect', 'transition']);
    });

    it('shows a host the background only when the admin left them a choice', () => {
        const allowed = {
            ...SAMPLE_SECTIONS.faq,
            style: { ...SAMPLE_SECTIONS.faq.style, hostBackgrounds: { enabled: true, allowed: ['top' as const] } },
        };
        const locked = {
            ...SAMPLE_SECTIONS.faq,
            style: { ...SAMPLE_SECTIONS.faq.style, hostBackgrounds: { enabled: false, allowed: ['top' as const] } },
        };
        expect(settingsGroups(allowed, 'host', SAMPLE_THEME)).toEqual(['faq', 'background']);
        expect(settingsGroups(locked, 'host', SAMPLE_THEME)).toEqual(['faq']);
    });

    it('keeps the footer to admins, without a transition', () => {
        expect(settingsGroups(SAMPLE_SECTIONS.footer, 'host', SAMPLE_THEME)).toEqual([]);
        expect(settingsGroups(SAMPLE_SECTIONS.footer, 'admin', SAMPLE_THEME)).toEqual(['footer', 'effect']);
    });

    it('adds the buttons group when the section has a link button', () => {
        const withLink = { ...SAMPLE_SECTIONS.blank, elements: [{ id: 'l1', kind: 'link' as const, text: 'Map', url: '' }] };
        expect(settingsGroups(withLink, 'admin', SAMPLE_THEME)).toContain('buttons');
    });

    it('leaves out the transition when the theme has none', () => {
        expect(settingsGroups(SAMPLE_SECTIONS.faq, 'admin', { ...SAMPLE_THEME, transitions: [] })).not.toContain('transition');
    });
});

describe('patchStyle', () => {
    it('sets, clears, and removes an empty style', () => {
        expect(patchStyle<{ size?: number; color?: string }>({ size: 10 }, { color: '#fff' })).toEqual({ size: 10, color: '#fff' });
        expect(patchStyle({ size: 10, color: '#fff' }, { color: undefined })).toEqual({ size: 10 });
        expect(patchStyle({ size: 10 }, { size: undefined })).toBeUndefined();
    });

    it('names one undo step per field', () => {
        expect(settingMergeKey('s1', 'style:size')).toBe('settings:s1:style:size');
    });
});

describe('documentLink', () => {
    it('keeps full links and adds https to bare domains', () => {
        expect(documentLink('https://maps.app.goo.gl/abc')).toBe('https://maps.app.goo.gl/abc');
        expect(documentLink(' hotel.gr/rooms ')).toBe('https://hotel.gr/rooms');
        expect(documentLink('mailto:a@b.gr')).toBe('mailto:a@b.gr');
    });

    it('clears an empty or bare scheme and refuses anything else', () => {
        expect(documentLink('  ')).toBe('');
        expect(documentLink('https://')).toBe('');
        expect(documentLink('javascript:alert(1)')).toBeNull();
        expect(documentLink('not a link')).toBeNull();
    });
});

describe('date', () => {
    it('switches the date words to English from iso', () => {
        const data = structuredClone(SAMPLE_SECTIONS.date.data);
        data.iso = '2026-07-12T18:00';
        applyDateLanguage(data, 'en');
        expect(data).toMatchObject({
            displayLanguage: 'en',
            day: 'Sunday',
            number: '12',
            month: 'July 2026',
            monthName: 'July',
            monthNumber: '07',
            yearLabel: '2026',
            yearShort: '26',
            periodLabel: 'IN THE AFTERNOON',
            time: '18:00',
        });
        applyDateLanguage(data, 'el');
        expect(data).toMatchObject({ day: 'Κυριακή', month: 'Ιουλίου 2026', monthName: 'Ιούλιος', monthGenitive: 'Ιουλίου' });
    });

    it('sets the layout and leaves the words when the language is the same', () => {
        const doc = documentWith(SAMPLE_SECTIONS.date);
        const id = SAMPLE_SECTIONS.date.id;
        expect(sectionOf(run(doc, setDateLayout(id, 'calendar')), 'date').data.displayStyle).toBe('calendar');
        const same = run(doc, setDateLanguage(id, SAMPLE_SECTIONS.date.data.displayLanguage));
        expect(sectionOf(same, 'date').data).toEqual(SAMPLE_SECTIONS.date.data);
    });
});

describe('style fields', () => {
    it('writes and clears a style field', () => {
        const doc = documentWith(SAMPLE_SECTIONS.countdown);
        const id = SAMPLE_SECTIONS.countdown.id;
        const sized = run(doc, patchSectionStyle(id, { size: 60 }));
        expect(sectionOf(sized, 'countdown').data.numberStyle?.size).toBe(60);
        const cleared = run(sized, patchSectionStyle(id, { size: undefined }));
        expect(sectionOf(cleared, 'countdown').data.numberStyle?.size).toBeUndefined();
    });

    it('hides fonts from hosts', () => {
        expect(visibleStyleGroups(COUNTDOWN_FIELDS, false)[0].fields.map((field) => field.key)).toEqual(['size', 'color']);
        expect(visibleStyleGroups(COUNTDOWN_FIELDS, true)[0].fields.map((field) => field.key)).toEqual(['font', 'size', 'color']);
    });

    it('keeps typed numbers in range and empties to the theme', () => {
        const field = COUNTDOWN_FIELDS[0].fields[1];
        expect(readStyleNumber(field, '500')).toBe(400);
        expect(readStyleNumber(field, '2')).toBe(6);
        expect(readStyleNumber(field, ' ')).toBeUndefined();
        expect(readStyleNumber(field, 'abc')).toBeUndefined();
    });

    it('moves an older program font and size to the time and text fields', () => {
        const old = { font: 'Lora', size: 20, color: '#111111' };
        expect(programStyleView(old)).toMatchObject({
            timeFont: 'Lora',
            labelFont: 'Lora',
            timeSize: 20,
            timeColor: '#111111',
            labelColor: '#111111',
        });
        expect(upgradeProgramStyle(old)).toEqual({
            timeFont: 'Lora',
            labelFont: 'Lora',
            timeSize: 20,
            color: '#111111',
            timeColor: '#111111',
            labelColor: '#111111',
        });
        expect(upgradeProgramStyle({ labelSize: 14 })).toEqual({ labelSize: 14 });
    });
});

describe('program moments', () => {
    const id = SAMPLE_SECTIONS.programIcons.id;
    const doc = documentWith(SAMPLE_SECTIONS.programIcons);

    it('adds an empty moment with an automatic icon', () => {
        const next = sectionOf(run(doc, addProgramItem(id, 'new-1')), 'programIcons');
        expect(next.data.items.at(-1)).toEqual({ id: 'new-1', time: '', label: '', description: '', icon: { kind: 'auto' } });
    });

    it('changes and deletes a moment, with its text styles', () => {
        const itemId = SAMPLE_SECTIONS.programIcons.data.items[0].id;
        const styled = { ...SAMPLE_SECTIONS.programIcons, textStyles: { [`items.${itemId}.label`]: { size: 20 } } };
        const updated = run(documentWith(styled), updateProgramItem(id, itemId, { time: '21:00', icon: { kind: 'preset', key: 'cake' } }));
        expect(sectionOf(updated, 'programIcons').data.items[0]).toMatchObject({ time: '21:00', icon: { kind: 'preset', key: 'cake' } });
        const deleted = sectionOf(run(updated, deleteProgramItem(id, itemId)), 'programIcons');
        expect(deleted.data.items.some((item) => item.id === itemId)).toBe(false);
        expect(deleted.textStyles).toEqual({});
    });

    it('adds a plain moment to a program without icons', () => {
        const next = sectionOf(run(documentWith(SAMPLE_SECTIONS.program), addProgramItem(SAMPLE_SECTIONS.program.id, 'p-1')), 'program');
        expect(next.data.items.at(-1)).toEqual({ id: 'p-1', time: '', label: '' });
    });
});

describe('links and colours', () => {
    it('sets stay, contact, partner, map, button and footer links', () => {
        const stayId = SAMPLE_SECTIONS.accommodation.data.items[0].id;
        const doc = documentWith(
            SAMPLE_SECTIONS.accommodation,
            SAMPLE_SECTIONS.contact,
            SAMPLE_SECTIONS.coupleContact,
            SAMPLE_SECTIONS.locations,
            { ...SAMPLE_SECTIONS.blank, elements: [{ id: 'l1', kind: 'link', text: 'Map', url: '' }] },
            SAMPLE_SECTIONS.footer,
        );
        let next = run(doc, setStayLinks(SAMPLE_SECTIONS.accommodation.id, stayId, { website: 'https://hotel.gr' }));
        next = run(next, setContactLink(SAMPLE_SECTIONS.contact.id, 'instagram', 'https://instagram.com/us'));
        next = run(next, setPartnerContactLink(SAMPLE_SECTIONS.coupleContact.id, 'partnerB', 'phone', '6911111111'));
        next = run(next, setLocationMap(SAMPLE_SECTIONS.locations.id, 'receptionMap', 'https://maps.app.goo.gl/x'));
        next = run(next, setLinkButton(SAMPLE_SECTIONS.blank.id, 'l1', { text: 'Χάρτης', url: 'https://maps.app.goo.gl/y' }));
        next = run(next, patchFooter(SAMPLE_SECTIONS.footer.id, { textColor: '#333333', link: 'https://storywall.gr' }));
        expect(sectionOf(next, 'accommodation').data.items[0].website).toBe('https://hotel.gr');
        expect(sectionOf(next, 'contact').data.instagram).toBe('https://instagram.com/us');
        expect(sectionOf(next, 'coupleContact').data.partnerB.phone).toBe('6911111111');
        expect(sectionOf(next, 'locations').data.receptionMap).toBe('https://maps.app.goo.gl/x');
        expect(sectionOf(next, 'blank').elements[0]).toMatchObject({ text: 'Χάρτης', url: 'https://maps.app.goo.gl/y' });
        expect(sectionOf(next, 'footer').data).toMatchObject({ textColor: '#333333', link: 'https://storywall.gr' });
        expect(sectionOf(run(next, patchFooter(SAMPLE_SECTIONS.footer.id, { textColor: undefined })), 'footer').data.textColor).toBeUndefined();
    });

    it('adds up to twelve dress code colours and removes one', () => {
        const id = SAMPLE_SECTIONS.dressCode.id;
        let doc = documentWith(SAMPLE_SECTIONS.dressCode);
        for (let i = 0; i < 20; i += 1) doc = run(doc, addDressCodeColor(id, '#123456'));
        expect(sectionOf(doc, 'dressCode').data.colors).toHaveLength(MAX_DRESS_CODE_COLORS);
        expect(sectionOf(run(doc, removeDressCodeColor(id, 0)), 'dressCode').data.colors).toHaveLength(MAX_DRESS_CODE_COLORS - 1);
    });
});

describe('backgrounds, effects and transitions', () => {
    const faq = SAMPLE_SECTIONS.faq;

    it('lets an admin pick automatic and sets it as the default', () => {
        const next = sectionOf(run(documentWith(faq), setThemeBackground(faq.id, 'content', 'admin', SAMPLE_THEME)), 'faq');
        expect(next.style.background).toEqual({ kind: 'theme', slot: 'content' });
        expect(next.style.themeBackgroundDefault).toBe('content');
    });

    it('lets a host pick only an allowed background that has art', () => {
        const section = {
            ...faq,
            style: {
                ...faq.style,
                background: { kind: 'theme' as const, slot: 'auto' as const },
                hostBackgrounds: { enabled: true, allowed: ['top' as const] },
            },
        };
        const doc = documentWith(section);
        expect(sectionOf(run(doc, setThemeBackground(faq.id, 'top', 'host', SAMPLE_THEME)), 'faq').style.background).toEqual({
            kind: 'theme',
            slot: 'top',
        });
        expect(sectionOf(run(doc, setThemeBackground(faq.id, 'content', 'host', SAMPLE_THEME)), 'faq').style.background).toEqual({
            kind: 'theme',
            slot: 'auto',
        });
        expect(sectionOf(run(doc, setThemeBackground(faq.id, 'auto', 'host', SAMPLE_THEME)), 'faq').style.themeBackgroundDefault).toBe(
            faq.style.themeBackgroundDefault,
        );
    });

    it('offers every background with art when the host switch is turned on with none ticked', () => {
        const section = { ...faq, style: { ...faq.style, hostBackgrounds: { enabled: false, allowed: ['extra' as const] } } };
        const next = sectionOf(run(documentWith(section), setHostBackgroundsEnabled(faq.id, true, SAMPLE_THEME)), 'faq');
        // The sample theme has no art for the third background.
        expect(next.style.hostBackgrounds).toEqual({ enabled: true, allowed: ['top', 'content'] });
        expect(hostBackgroundSlots(next, SAMPLE_THEME)).toEqual(['top', 'content']);
        const fewer = sectionOf(run(documentWith(next), setHostBackgroundAllowed(faq.id, 'top', false)), 'faq');
        expect(fewer.style.hostBackgrounds.allowed).toEqual(['content']);
        const more = sectionOf(run(documentWith(fewer), setHostBackgroundAllowed(faq.id, 'top', true)), 'faq');
        expect(more.style.hostBackgrounds.allowed).toEqual(['top', 'content']);
    });

    it('removes an effect back at its defaults', () => {
        const withEffect = sectionOf(run(documentWith(faq), setBackgroundEffect(faq.id, { type: 'canvasSnow', intensity: 'strong' })), 'faq');
        expect(withEffect.style.effect).toEqual({ type: 'canvasSnow', speed: 'slow', intensity: 'strong' });
        const none = sectionOf(run(documentWith(withEffect), setBackgroundEffect(faq.id, { type: 'none', intensity: 'subtle' })), 'faq');
        expect(none.style.effect).toBeUndefined();
    });

    it('sets and removes a transition, never on a locked section', () => {
        const next = sectionOf(run(documentWith(faq), setSectionTransition(faq.id, { assetId: 'tr-wave', edge: 'top' })), 'faq');
        expect(next.style.transition).toEqual({ assetId: 'tr-wave', edge: 'top' });
        expect(sectionOf(run(documentWith(next), setSectionTransition(faq.id, undefined)), 'faq').style.transition).toBeUndefined();
        const footer = run(
            documentWith(SAMPLE_SECTIONS.footer),
            setSectionTransition(SAMPLE_SECTIONS.footer.id, { assetId: 'tr-wave', edge: 'top' }),
        );
        expect(sectionOf(footer, 'footer').style.transition).toBeUndefined();
    });
});

describe('program icon upload', () => {
    it('takes SVG, PNG and WebP files up to 5 MB', () => {
        expect(iconUploadProblem({ type: 'image/svg+xml', name: 'a.svg', size: 10 })).toBeNull();
        expect(iconUploadProblem({ type: '', name: 'a.SVG', size: 10 })).toBeNull();
        expect(iconUploadProblem({ type: 'image/webp', name: 'a.webp', size: 10 })).toBeNull();
        expect(iconUploadProblem({ type: 'image/jpeg', name: 'a.jpg', size: 10 })).toBe('type');
        expect(iconUploadProblem({ type: 'image/png', name: 'a.png', size: 6 * 1024 * 1024 })).toBe('size');
    });

    it('tints SVG icons and keeps raster ones as they are', () => {
        expect(customProgramIcon('m1', 'rings.svg', true)).toEqual({
            kind: 'custom',
            image: { source: 'media', mediaId: 'm1' },
            mode: 'mask',
            name: 'rings.svg',
        });
        expect(customProgramIcon('m2', 'cake.png', false).mode).toBe('image');
    });

    it('draws an SVG within 512 px on its long side', () => {
        expect(svgRasterSize(1024, 512)).toEqual({ width: 512, height: 256 });
        expect(svgRasterSize(64, 64)).toEqual({ width: 64, height: 64 });
        expect(svgRasterSize(0, 0)).toEqual({ width: 512, height: 512 });
    });
});
