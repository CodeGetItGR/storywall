import type { Draft } from 'immer';
import type { CSSProperties, ElementType, ReactNode } from 'react';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { MAX_TEXT, type TextStyle } from '@/lib/invitation/primitives';
import { type InvitationSection, resolveTextField } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

// What the editor's inline text editing reads and writes. Every change is an
// Immer recipe the editor store runs, so undo, redo and autosave cover it.

// One editable text: a section's own field (its style lives in textStyles under
// the same path) or a text element a host added. Element ids are unique in the
// whole invitation, so an element is found by its id alone.
export type TextTarget = { kind: 'field'; sectionId: string; path: string } | { kind: 'element'; elementId: string };

// One text as the renderer draws it. The editor can draw it its own way (typing in place).
export type InvitationTextProps = {
    target: TextTarget;
    // What is stored.
    value: string;
    // What guests read, when it differs from what is stored (date labels in capitals).
    display?: string;
    tag: ElementType;
    className: string;
    style: CSSProperties;
};

export type TextRenderer = (props: InvitationTextProps) => ReactNode;

export type TextRole = 'title' | 'subtitle' | 'paragraph';

// Which texts a colour goes to.
export type ColorScope = 'text' | 'section' | 'all';

// A style change. `undefined` takes the setting off, so the text follows the theme again.
export type TextStylePatch = { [K in keyof TextStyle]?: TextStyle[K] | undefined };

export type FontOption = { value: string; label: string };

// The old editor's size and line spacing lists.
export const TEXT_SIZES = [14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 68, 80, 96, 120] as const;
export const LINE_HEIGHTS = [1.1, 1.3, 1.5, 1.7, 1.9, 2.2] as const;

// The old editor's own colours, after the theme's and the ones in use.
export const BASE_TEXT_COLORS = [
    '#2f2b2d', '#ffffff', '#000000', '#b8dfd3', '#efe7ec', '#c98f88',
    '#9bb7d4', '#c7b08b', '#8aa58d', '#d8b4c8', '#d6c36f', '#7f7f7f',
] as const;

// The fonts the old editor offered, by the CSS value it stored.
export const INVITATION_FONTS: readonly FontOption[] = [
    { value: 'Georgia,serif', label: 'Georgia' },
    { value: "'Times New Roman',serif", label: 'Times New Roman' },
    { value: 'Arial,sans-serif', label: 'Arial' },
    { value: "'GFS Neohellenic',serif", label: 'GFS Neohellenic' },
    { value: "'Playfair Display',serif", label: 'Playfair Display' },
    { value: "'Cormorant Garamond',serif", label: 'Cormorant Garamond' },
    { value: "'EB Garamond',serif", label: 'EB Garamond' },
    { value: 'Marcellus,serif', label: 'Marcellus' },
    { value: 'Cinzel,serif', label: 'Cinzel' },
    { value: 'Alegreya,serif', label: 'Alegreya' },
    { value: 'Lora,serif', label: 'Lora' },
    { value: "'Josefin Sans',sans-serif", label: 'Josefin Sans' },
    { value: 'Comfortaa,sans-serif', label: 'Comfortaa' },
    { value: 'Raleway,sans-serif', label: 'Raleway' },
    { value: 'Philosopher,serif', label: 'Philosopher' },
];

// The font value that means "the theme's font" (old 'inherit').
export const THEME_FONT = 'inherit';

// Starting size of a new text, as in the old editor.
export const NEW_TEXT_SIZES: Record<TextRole, number> = { title: 32, subtitle: 22, paragraph: 16 };

const MAX_ELEMENTS = 100;
const RECENT_LIMIT = 10;

export function textTargetKey(target: TextTarget): string {
    return target.kind === 'field' ? `field:${target.sectionId}:${target.path}` : `element:${target.elementId}`;
}

// Typing in one text, or dragging one setting, within a second is one undo step.
export function textMergeKey(target: TextTarget, part: string): string {
    return `${part}:${textTargetKey(target)}`;
}

type AnySection = InvitationSection | Draft<InvitationSection>;
type AnyDocument = InvitationDocument | Draft<InvitationDocument>;

function findSection<D extends AnyDocument>(document: D, sectionId: string): D['sections'][number] | undefined {
    return document.sections.find((section) => section.id === sectionId) as D['sections'][number] | undefined;
}

function findTargetSection<D extends AnyDocument>(document: D, target: TextTarget): D['sections'][number] | undefined {
    if (target.kind === 'field') return findSection(document, target.sectionId);
    return document.sections.find((section) => section.elements.some((element) => element.id === target.elementId)) as
        | D['sections'][number]
        | undefined;
}

// The section a text belongs to.
export function textSectionId(document: InvitationDocument, target: TextTarget): string | undefined {
    return findTargetSection(document, target)?.id;
}

function findTextElement(section: AnySection, elementId: string) {
    const element = section.elements.find((item) => item.id === elementId);
    return element?.kind === 'text' ? element : undefined;
}

export type TextSnapshot = { text: string; style: TextStyle };

// The text and its own style, or nothing when it no longer exists (an undo removed it).
export function readText(document: InvitationDocument, target: TextTarget): TextSnapshot | undefined {
    const section = findTargetSection(document, target);
    if (!section) return undefined;
    if (target.kind === 'element') {
        const element = findTextElement(section, target.elementId);
        return element ? { text: element.text, style: element.style } : undefined;
    }
    const value = readTextField(section, target.path);
    return value === undefined ? undefined : { text: value, style: section.textStyles[target.path] ?? {} };
}

// The record a field lives in and the field's name, read the way resolveTextField reads it:
// a list segment is an item's id.
function fieldParent(data: unknown, path: string): { parent: Record<string, unknown>; name: string } | undefined {
    const segments = path.split('.');
    const name = segments.pop();
    const parent = segments.length ? resolveTextField(data, segments.join('.')) : data;
    return name && isRecord(parent) ? { parent, name } : undefined;
}

// Texts a section may not have yet: a date's period and month in the genitive are optional.
const OPTIONAL_TEXT_FIELDS: Partial<Record<InvitationSection['type'], readonly string[]>> = {
    date: ['monthGenitive', 'periodLabel'],
};

// A field's text. An optional text the host never filled in reads as empty.
export function readTextField(section: Pick<InvitationSection, 'type' | 'data'>, path: string): string | undefined {
    const field = fieldParent(section.data, path);
    if (!field) return undefined;
    const value = field.parent[field.name];
    if (typeof value === 'string') return value;
    return value === undefined && OPTIONAL_TEXT_FIELDS[section.type]?.includes(path) ? '' : undefined;
}

function setTextField(section: Draft<InvitationSection>, path: string, value: string): boolean {
    const field = fieldParent(section.data, path);
    if (!field || readTextField(section, path) === undefined) return false;
    field.parent[field.name] = value;
    return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function writeText(draft: Draft<InvitationDocument>, target: TextTarget, text: string) {
    const section = findTargetSection(draft, target);
    if (!section) return;
    const value = text.slice(0, MAX_TEXT);
    if (target.kind === 'element') {
        const element = findTextElement(section, target.elementId);
        if (element) element.text = value;
        return;
    }
    setTextField(section, target.path, value);
}

function patchStyle(style: Draft<TextStyle>, patch: TextStylePatch) {
    for (const [key, value] of Object.entries(patch) as [keyof TextStyle, TextStyle[keyof TextStyle] | undefined][]) {
        if (value === undefined) delete style[key];
        else (style as Record<string, unknown>)[key] = value;
    }
}

export function writeStyle(draft: Draft<InvitationDocument>, target: TextTarget, patch: TextStylePatch) {
    const section = findTargetSection(draft, target);
    if (!section) return;
    if (target.kind === 'element') {
        const element = findTextElement(section, target.elementId);
        if (element) patchStyle(element.style, patch);
        return;
    }
    if (readTextField(section, target.path) === undefined) return;
    const style = section.textStyles[target.path] ?? {};
    section.textStyles[target.path] = style;
    patchStyle(section.textStyles[target.path], patch);
    // A field with no settings left has no entry, as the converter writes it.
    if (Object.keys(section.textStyles[target.path]).length === 0) delete section.textStyles[target.path];
}

// The colours a section keeps outside textStyles (the old global colour set them too).
function colorSectionExtras(section: Draft<InvitationSection>, color: string) {
    switch (section.type) {
        case 'countdown':
            section.data.numberStyle = { ...section.data.numberStyle, color };
            break;
        case 'rsvp':
            section.data.formStyle = { ...section.data.formStyle, labelColor: color };
            break;
        case 'program':
        case 'programIcons':
            section.data.programStyle = { ...section.data.programStyle, timeColor: color, labelColor: color };
            break;
        case 'faq':
            section.data.faqStyle = { ...section.data.faqStyle, questionColor: color, answerColor: color };
            break;
        case 'footer':
            section.data.textColor = color;
            break;
    }
}

function colorSection(section: Draft<InvitationSection>, color: string, fieldPaths: Iterable<string>) {
    for (const path of fieldPaths) {
        if (readTextField(section, path) === undefined) continue;
        section.textStyles[path] = { ...section.textStyles[path], color };
    }
    for (const element of section.elements) {
        if (element.kind === 'text') element.style.color = color;
    }
    colorSectionExtras(section, color);
}

// One text, every text in its section, or every text of the invitation (the old global text colour).
// `sectionPaths` are the fields the section shows, so the ones with no style of their own get the colour too.
export function writeColor(
    draft: Draft<InvitationDocument>,
    target: TextTarget,
    color: string,
    scope: ColorScope,
    sectionPaths: Iterable<string> = [],
) {
    if (scope === 'text') {
        writeStyle(draft, target, { color });
        return;
    }
    if (scope === 'section') {
        const section = findTargetSection(draft, target);
        if (section) colorSection(section, color, [...sectionPaths, ...Object.keys(section.textStyles)]);
        return;
    }
    // Every text: fields with no style of their own follow the invitation's text colour.
    draft.overrides.textColor = color;
    for (const section of draft.sections) colorSection(section, color, Object.keys(section.textStyles));
}

export function canAddText(document: InvitationDocument, sectionId: string): boolean {
    const section = findSection(document, sectionId);
    return Boolean(section && !section.locked && section.elements.length < MAX_ELEMENTS);
}

// A new text under the section's own fields: after the added text being edited, else last (as the old editor).
export function addTextElement(
    draft: Draft<InvitationDocument>,
    sectionId: string,
    element: { id: string; role: TextRole; text: string },
    afterElementId?: string,
) {
    const section = findSection(draft, sectionId);
    if (!section || section.locked || section.elements.length >= MAX_ELEMENTS) return;
    const text: InvitationElement = {
        id: element.id,
        kind: 'text',
        role: element.role,
        text: element.text,
        style: { size: NEW_TEXT_SIZES[element.role], align: 'center' },
    };
    const after = afterElementId ? section.elements.findIndex((item) => item.id === afterElementId) : -1;
    section.elements.splice(after >= 0 ? after + 1 : section.elements.length, 0, text);
}

// An added text goes away; a section's own text is emptied (it is part of the section).
export function deleteText(draft: Draft<InvitationDocument>, target: TextTarget) {
    const section = findTargetSection(draft, target);
    if (!section) return;
    if (target.kind === 'element') {
        section.elements = section.elements.filter((element) => element.id !== target.elementId);
        return;
    }
    setTextField(section, target.path, '');
}

// An added text left empty when the host moves on is removed, as in the old editor.
export function isEmptyAddedText(document: InvitationDocument, target: TextTarget): boolean {
    return target.kind === 'element' && readText(document, target)?.text.trim() === '';
}

function allTextStyles(document: InvitationDocument): TextStyle[] {
    return document.sections.flatMap((section) => [
        ...Object.values(section.textStyles),
        ...section.elements.flatMap((element) => (element.kind === 'text' ? [element.style] : [])),
    ]);
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
    const seen = new Set<string>();
    return values.filter((value) => {
        const id = key(value);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

const HEX = /^#[0-9a-f]{6}$/i;

// The theme's colours, the ones already used in the invitation, then the old editor's own.
export function textColorSwatches(document: InvitationDocument, theme: ThemeDesign): string[] {
    const used = [document.overrides.textColor, ...allTextStyles(document).map((style) => style.color)]
        .filter((color): color is string => Boolean(color && HEX.test(color)))
        .slice(0, RECENT_LIMIT);
    const themeColors = [theme.colors.primary, theme.colors.secondary, theme.colors.text].filter((color) => HEX.test(color));
    return uniqueBy([...themeColors, ...used, ...BASE_TEXT_COLORS], (color) => color.toLowerCase());
}

export function fontLabel(value: string): string {
    const first = value.split(',')[0] ?? value;
    return first.replace(/['"]/g, '').trim() || value;
}

export function uploadedFontOptions(fonts: InvitationFontDto[]): FontOption[] {
    return fonts.map((font) => ({ value: `'${font.familyName}',${font.fallback}`, label: font.familyName }));
}

// The theme's fonts first, then the ones used in the invitation, then every font. The theme font itself is offered apart.
export function fontOptions(document: InvitationDocument, theme: ThemeDesign, uploaded: InvitationFontDto[] = []): FontOption[] {
    const catalogue = [...INVITATION_FONTS, ...uploadedFontOptions(uploaded)];
    const named = (value: string): FontOption => catalogue.find((option) => sameFont(option.value, value)) ?? { value, label: fontLabel(value) };
    const themeFonts = [theme.fonts.title, theme.fonts.body].filter(Boolean).map(named);
    const used = allTextStyles(document)
        .map((style) => style.font)
        .filter((font): font is string => Boolean(font && font !== THEME_FONT))
        .map(named);
    return uniqueBy([...themeFonts, ...used, ...catalogue], (option) => fontLabel(option.value).toLowerCase());
}

// Two font values name the same family when their first family matches.
export function sameFont(a: string | undefined, b: string | undefined): boolean {
    if (!a || !b) return a === b;
    return fontLabel(a).toLowerCase() === fontLabel(b).toLowerCase();
}

// The size list with the text's own size in it, in order.
export function textSizeOptions(current: number | undefined): number[] {
    const sizes: number[] = [...TEXT_SIZES];
    if (current && !sizes.includes(current)) sizes.push(current);
    return sizes.sort((a, b) => a - b);
}
