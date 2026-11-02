import { convertElement } from '@/lib/invitation/convert/elements';
import type { MediaCollector } from '@/lib/invitation/convert/media';
import { isRecord, type Json, KeyLog, Reader } from '@/lib/invitation/convert/reader';
import { convertSectionData } from '@/lib/invitation/convert/sectionData';
import { convertSectionStyle } from '@/lib/invitation/convert/sectionStyle';
import { type ConvertedTheme,convertTheme } from '@/lib/invitation/convert/theme';
import { type ConvertContext, readTextStyle, warn } from '@/lib/invitation/convert/values';
import {
    findMissingThemeAssets,
    INVITATION_SCHEMA_VERSION,
    type InvitationDocument,
    invitationDocumentSchema,
} from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import type { TextStyle } from '@/lib/invitation/primitives';
import { type InvitationSection, resolveTextField } from '@/lib/invitation/sections';
import { themeDesignSchema } from '@/lib/invitation/theme';

export type ConvertInput = {
    state: Json;
    themeId: string;
    themeName: string;
    // A site's template, to tell the host's own changes from the template's.
    template?: ConvertedTheme;
};

export type ConvertResult = {
    ok: boolean;
    document: InvitationDocument;
    theme: ConvertedTheme;
    // Why it failed validation; empty when ok.
    errors: string[];
    // Things the converter changed or left out, for a person to check.
    warnings: string[];
    // Old settings nothing read or dropped on purpose.
    unmapped: string[];
};

// Editor-only state the old app saved next to the invitation.
const EDITOR_STATE_KEYS = [
    '_wedart', '_bgEffectEditingSectionId', 'activeText', 'insertAfter', 'lastSectionColor',
    'pending', 'pendingTextSection', 'recentTextColors', 'selectedSection',
];

export function convertState(input: ConvertInput, media: MediaCollector): ConvertResult {
    const ctx: ConvertContext = { media, themeElementIds: new Map(), warnings: [] };
    const log = new KeyLog();
    const root = Reader.of(input.state, '', log);
    root.drop(...EDITOR_STATE_KEYS);

    const theme = convertTheme(root.obj('theme'), input.themeName, ctx);
    const rawSections = root.rawTree('sections');
    const sectionLogs: [KeyLog, Json, string][] = [];
    const sections = (Array.isArray(rawSections) ? rawSections : []).map((raw, index) => {
        const sectionLog = new KeyLog();
        const type = isRecord(raw) && typeof raw.type === 'string' ? raw.type : 'unknown';
        sectionLogs.push([sectionLog, raw, type]);
        return convertSection(Reader.of(raw, type, sectionLog), ctx, index);
    });

    const document: InvitationDocument = {
        schemaVersion: INVITATION_SCHEMA_VERSION,
        themeId: input.themeId,
        overrides: input.template ? siteOverrides(theme, input.template) : {},
        sections: placeFooterLast(dropUnknownAssets(uniqueElementIds(uniqueSectionIds(sections, ctx), ctx), theme, ctx)),
    };
    if (input.template) reportThemeDrift(theme, input.template, ctx);

    const errors: string[] = [];
    const themeCheck = themeDesignSchema.safeParse(theme.design);
    if (!themeCheck.success) errors.push(...themeCheck.error.issues.map((issue) => `theme.${issue.path.join('.')}: ${issue.message}`));
    const documentCheck = invitationDocumentSchema.safeParse(document);
    if (!documentCheck.success) {
        errors.push(...documentCheck.error.issues.map((issue) => `${describePath(document, issue.path)}: ${issue.message}`));
    }
    if (themeCheck.success && documentCheck.success) {
        for (const id of findMissingThemeAssets(document, theme.design)) errors.push(`theme asset ${id} is used but not in the theme`);
    }

    const unmapped = new Set(log.unmapped(input.state, ''));
    for (const [sectionLog, raw, type] of sectionLogs) for (const path of sectionLog.unmapped(raw, type)) unmapped.add(path);

    return { ok: errors.length === 0, document, theme, errors, warnings: ctx.warnings, unmapped: [...unmapped].sort() };
}

function convertSection(section: Reader, ctx: ConvertContext, index: number): InvitationSection {
    const id = section.str('id') || `section${index}`;
    const oldType = section.str('type');
    const data = section.obj('data');
    // Keys with a dot are strays the old editor wrote next to the real field.
    data.drop(...data.keys().filter((key) => key.includes('.')));

    const texts = section.list('texts');
    const hasFrameElement = texts.some((text) => text.value.kind === 'photoFrame');
    const converted = convertSectionData(oldType, data, { ctx, sectionId: id }, hasFrameElement);
    const allowColumns = converted.type === 'blank';
    const elements = texts.flatMap((text) => {
        const element = convertElement(text, ctx, allowColumns);
        return element ? [element] : [];
    });
    if (converted.extraElement) elements.push(converted.extraElement);
    keepOneColumnBreak(elements, ctx, section.path);

    return {
        id,
        type: converted.type,
        name: section.str('name').slice(0, 300),
        // Sections without the flag were always shown.
        visible: section.bool('liveVisible') !== false,
        locked: section.bool('locked') === true || converted.type === 'footer',
        data: converted.data,
        textStyles: convertTextStyles(data.obj('_style'), converted.data, converted.styleRenames ?? [], oldType, ctx),
        elements,
        style: convertSectionStyle(section.obj('style'), ctx, elements.some((element) => element.kind === 'columnBreak')),
    } as InvitationSection;
}

// Styles of fields that are gone, with why.
const DROPPED_STYLES: Record<string, string[]> = {
    // `code` itself was never shown.
    dressCode: ['code'],
    // Merged into sponsorsNames, which keeps the first name's style.
    weddingSponsorsSimple: ['sponsor2Name'],
};

// Old styles are keyed by field path, with list positions as numbers. New
// ones point at list items by id, so they follow an item when it moves.
function convertTextStyles(
    styles: Reader,
    data: Record<string, unknown>,
    renames: [string, string][],
    oldType: string,
    ctx: ConvertContext,
): Record<string, TextStyle> {
    const out: Record<string, TextStyle> = {};
    const dropped = DROPPED_STYLES[oldType] ?? [];
    for (const oldPath of styles.keys()) {
        const style = readTextStyle(styles.obj(oldPath));
        if (dropped.includes(oldPath) || !Object.keys(style).length) continue;
        const path = itemIds(rename(oldPath, renames), data);
        if (!path || typeof resolveTextField(data, path) !== 'string') {
            warn(ctx, `${styles.path}.${oldPath}`, 'style for a field that no longer exists, left out');
            continue;
        }
        // A section's own sponsorsNames style wins over the one from sponsor1Name.
        if (out[path] && oldPath !== path) continue;
        out[path] = style;
    }
    return out;
}

function rename(path: string, renames: [string, string][]): string {
    for (const [from, to] of renames) {
        if (from.endsWith('.') ? path.startsWith(from) : path === from || path.startsWith(`${from}.`)) {
            return to + path.slice(from.length);
        }
    }
    return path;
}

function itemIds(path: string, data: unknown): string | undefined {
    let current = data;
    const segments = path.split('.').map((segment) => {
        if (Array.isArray(current) && /^\d+$/.test(segment)) {
            const item = current[Number(segment)] as unknown;
            current = item;
            return isRecord(item) && typeof item.id === 'string' ? item.id : undefined;
        }
        current = isRecord(current) ? current[segment] : undefined;
        return segment;
    });
    return segments.every(Boolean) ? segments.join('.') : undefined;
}

function keepOneColumnBreak(elements: InvitationElement[], ctx: ConvertContext, path: string) {
    const breaks = elements.filter((element) => element.kind === 'columnBreak');
    for (const extra of breaks.slice(1)) {
        elements.splice(elements.indexOf(extra), 1);
        warn(ctx, path, `removed an extra column break (${extra.id})`);
    }
}

function uniqueSectionIds(sections: InvitationSection[], ctx: ConvertContext): InvitationSection[] {
    const seen = new Set<string>();
    return sections.map((section) => {
        const id = uniqueId(section.id, seen);
        if (id !== section.id) warn(ctx, `sections.${section.id}`, `duplicate section id, renamed to ${id}`);
        return { ...section, id };
    });
}

function uniqueElementIds(sections: InvitationSection[], ctx: ConvertContext): InvitationSection[] {
    const seen = new Set<string>();
    return sections.map((section) => ({
        ...section,
        elements: section.elements.map((element) => {
            const id = uniqueId(element.id || `${section.id}-el`, seen);
            if (element.id && id !== element.id) warn(ctx, `sections.${section.id}`, `duplicate element id ${element.id}, renamed to ${id}`);
            return { ...element, id };
        }),
    }));
}

function uniqueId(id: string, seen: Set<string>): string {
    let candidate = id;
    for (let n = 2; seen.has(candidate); n += 1) candidate = `${id}-${n}`;
    seen.add(candidate);
    return candidate;
}

// Sections copied from another theme can point at its transitions and
// frames. The old app drew no transition and an empty frame for those.
function dropUnknownAssets(sections: InvitationSection[], theme: ConvertedTheme, ctx: ConvertContext): InvitationSection[] {
    const transitions = new Set(theme.design.transitions.map((transition) => transition.id));
    const frames = new Set(theme.design.frames.map((frame) => frame.id));
    return sections.map((section) => {
        const path = `sections.${section.id}`;
        const { transition, ...style } = section.style;
        const keepTransition = !transition || transitions.has(transition.assetId);
        if (!keepTransition) warn(ctx, path, `transition ${transition.assetId} is not in this theme, removed`);
        return {
            ...section,
            style: keepTransition ? section.style : style,
            elements: section.elements.map((element) => {
                if (element.kind !== 'photoFrame' || !element.frameId || frames.has(element.frameId)) return element;
                warn(ctx, path, `frame ${element.frameId} is not in this theme, left empty`);
                return { ...element, frameId: '' };
            }),
        };
    });
}

function placeFooterLast(sections: InvitationSection[]): InvitationSection[] {
    return [...sections.filter((section) => section.type !== 'footer'), ...sections.filter((section) => section.type === 'footer')];
}

// A site keeps the template's design; only the preset and text colour are
// the host's own.
function siteOverrides(site: ConvertedTheme, template: ConvertedTheme): InvitationDocument['overrides'] {
    const overrides: InvitationDocument['overrides'] = {};
    const preset = site.design.typographyPresetId;
    if (preset && (preset !== template.design.typographyPresetId || site.presetForce !== false)) {
        overrides.typographyPresetId = preset;
    }
    if (site.design.colors.text !== template.design.colors.text) overrides.textColor = site.design.colors.text;
    return overrides;
}

function reportThemeDrift(site: ConvertedTheme, template: ConvertedTheme, ctx: ConvertContext) {
    const ignored = new Set(['typographyPresetId']);
    const changed = Object.keys(site.design).filter(
        (key) => !ignored.has(key)
            && JSON.stringify(site.design[key as keyof typeof site.design]) !== JSON.stringify(template.design[key as keyof typeof template.design]),
    );
    const colors = changed.includes('colors')
        ? Object.keys(site.design.colors).filter(
            (key) => key !== 'text' && site.design.colors[key as 'primary'] !== template.design.colors[key as 'primary'],
        )
        : [];
    const differing = changed.filter((key) => key !== 'colors' || colors.length);
    if (differing.length) warn(ctx, 'theme', `differs from the current template in: ${differing.join(', ')}`);
}

function describePath(document: InvitationDocument, path: PropertyKey[]): string {
    if (path[0] === 'sections' && typeof path[1] === 'number') {
        const section = document.sections[path[1]];
        return [`sections.${section?.type}(${section?.id})`, ...path.slice(2).map(String)].join('.');
    }
    return path.map(String).join('.');
}
