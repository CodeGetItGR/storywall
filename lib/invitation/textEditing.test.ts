import { type Draft, produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { InvitationDocument } from '@/lib/invitation/document';
import { MAX_TEXT } from '@/lib/invitation/primitives';
import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';
import {
    addTextElement,
    BASE_TEXT_COLORS,
    canAddText,
    deleteText,
    fontOptions,
    INVITATION_FONTS,
    isEmptyAddedText,
    readText,
    sameFont,
    textColorSwatches,
    textMergeKey,
    textSectionId,
    textSizeOptions,
    type TextTarget,
    textTargetKey,
    writeColor,
    writeStyle,
    writeText,
} from '@/lib/invitation/textEditing';

const field = (sectionId: string, path: string): TextTarget => ({ kind: 'field', sectionId, path });
const element = (elementId: string): TextTarget => ({ kind: 'element', elementId });

const INVITATION_TEXT = field('s-invitation', 'text');
const GODPARENT_NAME = field('s-godparents', 'godparents.g2.name');
const INVITATION_TITLE = element('e-inv-title');

const edit = (recipe: (draft: Draft<InvitationDocument>) => void) => produce(SAMPLE_DOCUMENT, recipe);
const sectionOf = (document: InvitationDocument, id: string) => document.sections.find((section) => section.id === id)!;

describe('text targets', () => {
    it('keys a field by section and path, and an element by its id', () => {
        expect(textTargetKey(INVITATION_TEXT)).toBe('field:s-invitation:text');
        expect(textTargetKey(INVITATION_TITLE)).toBe('element:e-inv-title');
        expect(textMergeKey(INVITATION_TITLE, 'text')).toBe('text:element:e-inv-title');
    });

    it('finds the section of an element by its id alone', () => {
        expect(textSectionId(SAMPLE_DOCUMENT, INVITATION_TITLE)).toBe('s-invitation');
        expect(textSectionId(SAMPLE_DOCUMENT, element('missing'))).toBeUndefined();
    });
});

describe('readText', () => {
    it('reads a field with its style, and a list item by its id', () => {
        expect(readText(SAMPLE_DOCUMENT, INVITATION_TEXT)).toEqual({ text: 'Με χαρά σας προσκαλούμε…', style: {} });
        expect(readText(SAMPLE_DOCUMENT, GODPARENT_NAME)).toEqual({ text: 'Άννα', style: { color: '#7a5c61' } });
    });

    it('reads an added text', () => {
        expect(readText(SAMPLE_DOCUMENT, INVITATION_TITLE)).toEqual({ text: 'Πρόσκληση', style: { size: 32, align: 'center' } });
    });

    it('finds nothing when the text is gone', () => {
        expect(readText(SAMPLE_DOCUMENT, field('s-invitation', 'missing'))).toBeUndefined();
        expect(readText(SAMPLE_DOCUMENT, field('s-godparents', 'godparents.g9.name'))).toBeUndefined();
        expect(readText(SAMPLE_DOCUMENT, element('e-b-img'))).toBeUndefined();
    });
});

describe('writeText', () => {
    it('writes a field, a list item and an added text', () => {
        const next = edit((draft) => {
            writeText(draft, INVITATION_TEXT, 'Καλώς ήρθατε');
            writeText(draft, GODPARENT_NAME, 'Άννα Μ.');
            writeText(draft, INVITATION_TITLE, 'Γάμος');
        });
        expect(readText(next, INVITATION_TEXT)?.text).toBe('Καλώς ήρθατε');
        expect(readText(next, GODPARENT_NAME)?.text).toBe('Άννα Μ.');
        expect(readText(next, INVITATION_TITLE)?.text).toBe('Γάμος');
    });

    it('keeps a text within the format limit', () => {
        const next = edit((draft) => writeText(draft, INVITATION_TEXT, 'α'.repeat(MAX_TEXT + 10)));
        expect(readText(next, INVITATION_TEXT)?.text).toHaveLength(MAX_TEXT);
    });

    it('does not create a field that is not there', () => {
        const next = edit((draft) => writeText(draft, field('s-invitation', 'nope'), 'x'));
        expect(next).toBe(SAMPLE_DOCUMENT);
    });
});

describe('writeStyle', () => {
    it('stores a field style under its path', () => {
        const next = edit((draft) => writeStyle(draft, INVITATION_TEXT, { size: 24, bold: true }));
        expect(sectionOf(next, 's-invitation').textStyles.text).toEqual({ size: 24, bold: true });
    });

    it('takes a setting off, and drops the entry once it is empty', () => {
        const styled = edit((draft) => writeStyle(draft, INVITATION_TEXT, { size: 24, bold: true }));
        const lighter = produce(styled, (draft) => writeStyle(draft, INVITATION_TEXT, { bold: undefined }));
        expect(sectionOf(lighter, 's-invitation').textStyles.text).toEqual({ size: 24 });
        const plain = produce(lighter, (draft) => writeStyle(draft, INVITATION_TEXT, { size: undefined }));
        expect(sectionOf(plain, 's-invitation').textStyles).not.toHaveProperty('text');
    });

    it('styles an added text in place', () => {
        const next = edit((draft) => writeStyle(draft, INVITATION_TITLE, { italic: true, align: 'left' }));
        expect(readText(next, INVITATION_TITLE)?.style).toEqual({ size: 32, align: 'left', italic: true });
    });

    it('ignores a field that is not there', () => {
        expect(edit((draft) => writeStyle(draft, field('s-invitation', 'nope'), { size: 20 }))).toBe(SAMPLE_DOCUMENT);
    });
});

describe('writeColor', () => {
    it('colours one text', () => {
        const next = edit((draft) => writeColor(draft, INVITATION_TEXT, '#123456', 'text'));
        expect(readText(next, INVITATION_TEXT)?.style.color).toBe('#123456');
        expect(readText(next, INVITATION_TITLE)?.style.color).toBeUndefined();
    });

    it('colours every text of the section, including the fields it shows', () => {
        const next = edit((draft) => writeColor(draft, INVITATION_TEXT, '#123456', 'section', ['text']));
        expect(readText(next, INVITATION_TEXT)?.style.color).toBe('#123456');
        expect(readText(next, INVITATION_TITLE)?.style.color).toBe('#123456');
        expect(next.overrides.textColor).toBeUndefined();
        expect(readText(next, GODPARENT_NAME)?.style.color).toBe('#7a5c61');
    });

    it("colours a section's own extras", () => {
        const next = edit((draft) => writeColor(draft, field('s-faq', 'title'), '#123456', 'section'));
        const faq = sectionOf(next, 's-faq');
        expect(faq.type === 'faq' && faq.data.faqStyle).toMatchObject({ questionColor: '#123456', answerColor: '#123456', borderWidth: 1 });
    });

    it('colours every text of the invitation, as the old global text colour', () => {
        const next = edit((draft) => writeColor(draft, INVITATION_TEXT, '#123456', 'all'));
        expect(next.overrides.textColor).toBe('#123456');
        expect(readText(next, GODPARENT_NAME)?.style.color).toBe('#123456');
        expect(readText(next, INVITATION_TITLE)?.style.color).toBe('#123456');
        expect(readText(next, element('e-b-left'))?.style.color).toBe('#123456');
        // Styled fields keep their other settings.
        expect(sectionOf(next, 's-parentsPhoto').textStyles['parentA.name']).toEqual({ size: 26, bold: true, color: '#123456' });

        const extras = Object.fromEntries(next.sections.map((section) => [section.type, section.data]));
        expect(extras.countdown).toMatchObject({ numberStyle: { size: 44, color: '#123456' } });
        expect(extras.rsvp).toMatchObject({ formStyle: { labelColor: '#123456', buttonBg: '#b8dfd3' } });
        expect(extras.program).toMatchObject({ programStyle: { timeColor: '#123456', labelColor: '#123456' } });
        expect(extras.programIcons).toMatchObject({ programStyle: { timeColor: '#123456', labelColor: '#123456', lineWidth: 2 } });
        expect(extras.faq).toMatchObject({ faqStyle: { questionColor: '#123456', answerColor: '#123456' } });
        expect(extras.footer).toMatchObject({ textColor: '#123456' });
    });
});

describe('adding and deleting texts', () => {
    it('adds a text at the end of the section, sized for its role', () => {
        const next = edit((draft) => addTextElement(draft, 's-invitation', { id: 'e-new', role: 'paragraph', text: 'Νέα παράγραφος' }));
        expect(sectionOf(next, 's-invitation').elements.at(-1)).toEqual({
            id: 'e-new',
            kind: 'text',
            role: 'paragraph',
            text: 'Νέα παράγραφος',
            style: { size: 16, align: 'center' },
        });
    });

    it('adds a text right after the one being edited', () => {
        const next = edit((draft) => addTextElement(draft, 's-blank', { id: 'e-new', role: 'subtitle', text: 'x' }, 'e-b-title'));
        expect(sectionOf(next, 's-blank').elements.map((item) => item.id).slice(0, 3)).toEqual(['e-b-title', 'e-new', 'e-b-left']);
        expect(readText(next, element('e-new'))?.style.size).toBe(22);
    });

    it('adds nothing to a locked section', () => {
        expect(canAddText(SAMPLE_DOCUMENT, 's-footer')).toBe(false);
        expect(canAddText(SAMPLE_DOCUMENT, 's-invitation')).toBe(true);
        expect(edit((draft) => addTextElement(draft, 's-footer', { id: 'e-new', role: 'title', text: 'x' }))).toBe(SAMPLE_DOCUMENT);
    });

    it('removes an added text and empties a section text', () => {
        const next = edit((draft) => {
            deleteText(draft, INVITATION_TITLE);
            deleteText(draft, INVITATION_TEXT);
        });
        expect(readText(next, INVITATION_TITLE)).toBeUndefined();
        expect(readText(next, INVITATION_TEXT)?.text).toBe('');
    });

    it('tells an empty added text apart from an empty section text', () => {
        const next = edit((draft) => {
            writeText(draft, INVITATION_TITLE, '  ');
            writeText(draft, INVITATION_TEXT, '');
        });
        expect(isEmptyAddedText(next, INVITATION_TITLE)).toBe(true);
        expect(isEmptyAddedText(next, INVITATION_TEXT)).toBe(false);
        expect(isEmptyAddedText(SAMPLE_DOCUMENT, INVITATION_TITLE)).toBe(false);
    });
});

describe('toolbar choices', () => {
    it('lists the theme colours, then the used ones, then the base colours, once each', () => {
        const swatches = textColorSwatches(SAMPLE_DOCUMENT, SAMPLE_THEME);
        expect(swatches.slice(0, 4)).toEqual(['#b8dfd3', '#efe7ec', '#2f2b2d', '#7a5c61']);
        expect(swatches).toEqual(expect.arrayContaining([...BASE_TEXT_COLORS]));
        expect(new Set(swatches.map((color) => color.toLowerCase())).size).toBe(swatches.length);
    });

    it('lists the theme fonts, then the used ones, then every font', () => {
        const document = edit((draft) => writeStyle(draft, INVITATION_TEXT, { font: "'Lora',serif" }));
        const options = fontOptions(document, SAMPLE_THEME, [{ key: 'f1', familyName: 'Host Script', fallback: 'serif', url: 'https://example.com/host.woff2' }]);
        expect(options.slice(0, 3).map((option) => option.label)).toEqual(['Georgia', 'Arial', 'Lora']);
        expect(options.map((option) => option.label)).toContain('Host Script');
        expect(options.find((option) => option.label === 'Host Script')?.value).toBe("'Host Script',serif");
        expect(options).toHaveLength(INVITATION_FONTS.length + 1);
    });

    it('matches fonts by their first family', () => {
        expect(sameFont("'Lora',serif", 'Lora, Georgia, serif')).toBe(true);
        expect(sameFont('Lora,serif', 'Lato,serif')).toBe(false);
        expect(sameFont(undefined, undefined)).toBe(true);
    });

    it("puts the text's own size into the size list", () => {
        expect(textSizeOptions(30)).toContain(30);
        expect(textSizeOptions(30).indexOf(30)).toBe(textSizeOptions(30).indexOf(32) - 1);
        expect(textSizeOptions(32)).toHaveLength(14);
    });
});
