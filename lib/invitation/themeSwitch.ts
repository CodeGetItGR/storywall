import { type InvitationDocument, invitationDocumentSchema } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import { newSectionId } from '@/lib/invitation/newSection';
import type { ImageRef } from '@/lib/invitation/primitives';
import { type InvitationSection, MULTI_INSTANCE_SECTION_TYPES, resolveTextField, type SectionType } from '@/lib/invitation/sections';
import type { SectionStyle } from '@/lib/invitation/sectionStyle';
import type { ThemeDesign } from '@/lib/invitation/theme';

// Switching an invitation to another theme (KAN-206). The host's content (texts, photos, dates and
// lists) carries over into the new theme's look: every section takes the style of the new theme's
// section of the same kind. A section the new theme has no kind for stays in the document, hidden,
// so switching back shows it again. Sections only the new theme has are left out, and the host's
// text colour and font set go back to the new theme's.

export type ThemeSwitchTarget = {
    // The new theme's own invitation: where every section's look comes from.
    document: InvitationDocument;
    theme: ThemeDesign;
    // Every image id the new theme uses.
    imageIds: ReadonlySet<string>;
};

export type ThemeSwitchSection = { id: string; type: SectionType };

export type ThemeSwitchPlan = {
    document: InvitationDocument;
    // The host's sections the new theme has no kind for: hidden, not deleted.
    hidden: ThemeSwitchSection[];
    // Sections an earlier switch hid that the new theme has, shown again.
    restored: ThemeSwitchSection[];
    // The host had changed the text colour or font set, which go back to the new theme's.
    resetsTextLook: boolean;
};

// Fields of a section's data that are its look, not its content: they come from the new theme.
const DESIGN_DATA_KEYS = [
    'decoration',
    'displayStyle',
    'desktopColumns',
    'layout',
    'shape',
    'numberStyle',
    'formStyle',
    'cardStyle',
    'programStyle',
    'iconStyle',
    'faqStyle',
    'textColor',
    'font',
] as const;

const DROP = Symbol('drop');

type Images = {
    // An image of the old theme the new one doesn't have: a sample photo or a decoration.
    isForeign: (ref: ImageRef) => boolean;
};

export function planThemeSwitch(current: InvitationDocument, target: ThemeSwitchTarget, oldThemeImageIds: ReadonlySet<string>): ThemeSwitchPlan {
    const themeAssets = new Set([...target.theme.elements, ...target.theme.frames, ...target.theme.transitions].map((asset) => asset.id));
    const images: Images = {
        isForeign: (ref) =>
            ref.source === 'theme' ? !themeAssets.has(ref.assetId) : oldThemeImageIds.has(ref.mediaId) && !target.imageIds.has(ref.mediaId),
    };
    const counterpartOf = counterparts(target.document.sections);
    const elementIds = new Set(current.sections.flatMap((section) => section.elements.map((element) => element.id)));
    const hidden: ThemeSwitchSection[] = [];
    const restored: ThemeSwitchSection[] = [];

    const sections = current.sections.map((section) => {
        const counterpart = counterpartOf(section);
        if (!counterpart) {
            if (section.visible) hidden.push({ id: section.id, type: section.type });
            return hideSection(section, images);
        }
        if (section.hiddenByTheme) restored.push({ id: section.id, type: section.type });
        return restyleSection(section, counterpart, images, target.theme, elementIds);
    });

    const document = invitationDocumentSchema.parse({ ...current, themeId: target.document.themeId, overrides: {}, sections });
    const { overrides } = current;
    return { document, hidden, restored, resetsTextLook: overrides.textColor !== undefined || overrides.typographyPresetId !== undefined };
}

// The new theme's section for each of the host's: the one of the same kind. A kind that may appear
// more than once pairs up in order; extra ones take the look of the theme's last one.
function counterparts(templateSections: readonly InvitationSection[]) {
    const byType = new Map<SectionType, InvitationSection[]>();
    for (const section of templateSections) byType.set(section.type, [...(byType.get(section.type) ?? []), section]);
    const seen = new Map<SectionType, number>();
    return (section: InvitationSection): InvitationSection | undefined => {
        const list = byType.get(section.type);
        if (!list) return undefined;
        if (!MULTI_INSTANCE_SECTION_TYPES.has(section.type)) return list[0];
        const index = seen.get(section.type) ?? 0;
        seen.set(section.type, index + 1);
        return list[Math.min(index, list.length - 1)];
    };
}

function restyleSection(
    section: InvitationSection,
    counterpart: InvitationSection,
    images: Images,
    theme: ThemeDesign,
    elementIds: Set<string>,
): InvitationSection {
    const data = carry(section.data, counterpart.data, images) as Record<string, unknown>;
    const templateData = counterpart.data as Record<string, unknown>;
    for (const key of DESIGN_DATA_KEYS) {
        if (key in templateData) data[key] = templateData[key];
        else delete data[key];
    }
    const textStyles = Object.fromEntries(
        Object.entries(counterpart.textStyles).filter(([path]) => typeof resolveTextField(data, path) === 'string'),
    );
    const restyled: Record<string, unknown> = {
        ...section,
        visible: section.hiddenByTheme ? true : section.visible,
        // The footer stays locked; other locks are the new theme's.
        locked: section.type === 'footer' || counterpart.locked,
        data,
        textStyles,
        elements: restyleElements(section.elements, counterpart.elements, images, theme, elementIds),
        style: counterpart.style,
    };
    delete restyled.hiddenByTheme;
    return restyled as InvitationSection;
}

// Hidden for now: its content stays as it is, without the old theme's images, which the new
// theme can't show.
function hideSection(section: InvitationSection, images: Images): InvitationSection {
    const shown = section.visible;
    return {
        ...section,
        visible: false,
        ...(shown || section.hiddenByTheme ? { hiddenByTheme: true as const } : {}),
        locked: section.type === 'footer' && section.locked,
        data: carry(section.data, undefined, images),
        elements: section.elements.flatMap((element) => keptElement(element, images, '')),
        style: plainStyle(section.style, images),
    } as InvitationSection;
}

function plainStyle(style: SectionStyle, images: Images): SectionStyle {
    const next: SectionStyle = { ...style };
    if (next.transition) delete next.transition;
    if (next.background.kind === 'image' && images.isForeign(next.background.image)) next.background = { kind: 'theme', slot: 'auto' };
    return next;
}

// The host's elements in the new look: their texts take the style of the new theme's text of the
// same role, frames take the new theme's frame, and the old theme's decorations make way for the
// new theme's, each at its place in the new theme's section.
function restyleElements(
    elements: readonly InvitationElement[],
    templateElements: readonly InvitationElement[],
    images: Images,
    theme: ThemeDesign,
    elementIds: Set<string>,
): InvitationElement[] {
    const templateFrame = templateElements.find((element) => element.kind === 'photoFrame' && element.frameId !== '');
    const frameId = templateFrame?.kind === 'photoFrame' ? templateFrame.frameId : (theme.frames[0]?.id ?? '');
    const kept = elements.flatMap((element) => {
        if (element.kind === 'image' && element.image.source === 'theme') return [];
        if (element.kind === 'text') {
            const match = templateElements.find((item) => item.kind === 'text' && item.role === element.role);
            return [{ ...element, style: match?.kind === 'text' ? match.style : {} }];
        }
        return keptElement(element, images, frameId);
    });
    templateElements.forEach((element, index) => {
        if (element.kind !== 'image' || element.image.source !== 'theme') return;
        const id = elementIds.has(element.id) ? newSectionId() : element.id;
        elementIds.add(id);
        kept.splice(Math.min(index, kept.length), 0, { ...element, id });
    });
    return kept;
}

function keptElement(element: InvitationElement, images: Images, frameId: string): InvitationElement[] {
    if (element.kind === 'image') return images.isForeign(element.image) ? [] : [element];
    if (element.kind === 'photoFrame') {
        const photo = element.photo && images.isForeign(element.photo) ? undefined : element.photo;
        const known = element.frameId === '' || !images.isForeign({ source: 'theme', assetId: element.frameId });
        const next = { ...element, frameId: known ? element.frameId : frameId };
        if (photo) return [{ ...next, photo }];
        delete next.photo;
        return [next];
    }
    const carried = carry(element, undefined, images);
    return carried === DROP ? [] : [carried as InvitationElement];
}

// The host's value with the old theme's images taken out: each one becomes the new theme's image in
// the same place, or goes. A program icon that loses its image picks one from its label again.
function carry(value: unknown, template: unknown, images: Images): unknown {
    if (isImageRef(value)) {
        if (!images.isForeign(value)) return value;
        return isImageRef(template) && !images.isForeign(template) ? template : DROP;
    }
    if (Array.isArray(value)) {
        const items = Array.isArray(template) ? template : [];
        return value.map((item, index) => carry(item, matchingItem(items, item, index), images)).filter((item) => item !== DROP);
    }
    if (isRecord(value)) {
        const templateRecord = isRecord(template) ? template : {};
        const next: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
            const carried = carry(child, templateRecord[key], images);
            if (carried !== DROP) next[key] = carried;
            else if (key === 'image') return value.kind === 'custom' ? { kind: 'auto' } : DROP;
        }
        return next;
    }
    return value;
}

// A list item's counterpart: the item with the same id, else the one at the same place.
function matchingItem(items: readonly unknown[], item: unknown, index: number): unknown {
    if (isRecord(item) && typeof item.id === 'string') {
        const byId = items.find((candidate) => isRecord(candidate) && candidate.id === item.id);
        if (byId) return byId;
    }
    return items[index];
}

function isImageRef(value: unknown): value is ImageRef {
    return isRecord(value) && (value.source === 'media' || value.source === 'theme') && ('mediaId' in value || 'assetId' in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Every image id a theme uses, from its public answer: those a host's draft must not keep once it
// leaves that theme, unless the new theme uses them too.
export function themeImageIds(assetUrls: Record<string, string> | undefined): Set<string> {
    return new Set(Object.keys(assetUrls ?? {}));
}
