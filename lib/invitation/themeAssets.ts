import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { ThemeShare } from '@/lib/invitation/editorStore';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import type { BackgroundSlot } from '@/lib/invitation/themeEditing';

// The images an admin keeps in a theme (KAN-68): backgrounds, art, elements, frames,
// transitions and the share image. Every image is a theme asset, named by its asset id.

export const THEME_ASSET_ACCEPT = 'image/jpeg,image/png,image/webp';

export const ART_SLOTS = ['main', 'ceremonyIcon', 'welcomeIcon', 'receptionIcon'] as const;
export type ArtSlot = (typeof ART_SLOTS)[number];
// The art that gets a size handle on the canvas.
export const SIZED_ART_SLOTS: readonly ArtSlot[] = ['main', 'ceremonyIcon'];

export const ART_SCALE = { min: 0.4, max: 2.5 };
// The width the renderer draws each art at, before its scale.
export const ART_BASE_WIDTH: Record<ArtSlot, number> = { main: 420, ceremonyIcon: 110, welcomeIcon: 110, receptionIcon: 110 };

export type BackgroundDevice = 'desktop' | 'mobile';
export type ThemeListKind = 'elements' | 'frames' | 'transitions';

type ThemeDraft = Draft<ThemeDesign>;
type DocumentDraft = Draft<InvitationDocument>;

// The id of a new element, frame or transition. Asset ids from uploads are the backend's.
export const newThemeItemId = (kind: 'element' | 'frame' | 'transition') => `${kind}-${crypto.randomUUID()}`;

// A file's name without its extension: the name a new element starts with.
export function nameFromFile(file: { name: string }): string {
    return file.name.replace(/\.[^.]+$/, '').slice(0, 300);
}

export function setBackgroundImage(theme: ThemeDraft, slot: BackgroundSlot, device: BackgroundDevice, mediaId: string | null) {
    if (mediaId) theme.backgrounds[slot][device] = { mediaId };
    else delete theme.backgrounds[slot][device];
}

// New art starts at its natural size with no animation; a replaced image keeps both.
export function setArtImage(theme: ThemeDraft, slot: ArtSlot, mediaId: string | null) {
    const art = theme.art[slot];
    if (!mediaId) delete theme.art[slot];
    else if (art) art.image = { mediaId };
    else theme.art[slot] = { image: { mediaId }, scale: 1, animation: 'none' };
}

export function setArtScale(theme: ThemeDraft, slot: ArtSlot, scale: number) {
    const art = theme.art[slot];
    if (art) art.scale = clampScale(scale);
}

export function clampScale(scale: number): number {
    return Math.round(Math.min(ART_SCALE.max, Math.max(ART_SCALE.min, scale)) * 100) / 100;
}

// Dragging the dot right by the art's own width doubles it.
export function draggedArtScale(start: number, dx: number, slot: ArtSlot): number {
    return clampScale(start + dx / ART_BASE_WIDTH[slot]);
}

export function addElement(theme: ThemeDraft, element: { id: string; name: string; mediaId: string }) {
    theme.elements.push({ id: element.id, name: element.name, image: { mediaId: element.mediaId } });
}

export function addFrame(theme: ThemeDraft, frame: { id: string; name: string; art: string; mask: string; width: number; height: number }) {
    theme.frames.push({
        id: frame.id,
        name: frame.name,
        art: { mediaId: frame.art },
        mask: { mediaId: frame.mask },
        width: frame.width,
        height: frame.height,
    });
}

export function addTransition(theme: ThemeDraft, transition: { id: string; name: string; desktop: string; mobile: string | null }) {
    theme.transitions.push({
        id: transition.id,
        name: transition.name,
        desktop: { mediaId: transition.desktop },
        ...(transition.mobile ? { mobile: { mediaId: transition.mobile } } : {}),
    });
}

export function renameThemeItem(theme: ThemeDraft, kind: ThemeListKind, id: string, name: string) {
    const item = theme[kind].find((entry) => entry.id === id);
    if (item) item.name = name.slice(0, 300);
}

// Takes an element, frame or transition out of the theme, and out of every section that used it,
// so the default invitation never points at something the theme no longer has.
export function removeThemeItem(theme: ThemeDraft, document: DocumentDraft, kind: ThemeListKind, id: string) {
    const index = theme[kind].findIndex((entry) => entry.id === id);
    if (index >= 0) theme[kind].splice(index, 1);
    for (const section of document.sections) removeThemeItemUses(section, id);
}

function removeThemeItemUses(section: Draft<InvitationSection>, id: string) {
    if (section.style.transition?.assetId === id) delete section.style.transition;
    const data = section.data as { decoration?: { image: { source: string; assetId?: string } } };
    if (data.decoration?.image.source === 'theme' && data.decoration.image.assetId === id) delete data.decoration;
    for (const element of section.elements) {
        if (element.kind === 'photoFrame' && element.frameId === id) element.frameId = '';
    }
    section.elements = section.elements.filter(
        (element) => !(element.kind === 'image' && element.image.source === 'theme' && element.image.assetId === id),
    );
}

export function setShareImage(share: Draft<ThemeShare>, mediaId: string | null) {
    share.imageId = mediaId;
}

// ---- Element slots of the family sections ----

export const DECORATED_SECTION_TYPES = ['parentsSimple', 'coupleProfilesSimple', 'weddingSponsorsSimple'] as const;
export const DEFAULT_DECORATION_WIDTH = 220;

export function hasDecorationSlot(section: InvitationSection): boolean {
    return (DECORATED_SECTION_TYPES as readonly string[]).includes(section.type);
}

// '' takes the element out; another element keeps the width the slot had.
export function setSectionDecoration(document: DocumentDraft, sectionId: string, elementId: string) {
    const section = document.sections.find((item) => item.id === sectionId);
    if (!section || !hasDecorationSlot(section)) return;
    const data = section.data as { decoration?: { image: { source: 'theme'; assetId: string }; width: number } };
    if (!elementId) delete data.decoration;
    else data.decoration = { image: { source: 'theme', assetId: elementId }, width: data.decoration?.width ?? DEFAULT_DECORATION_WIDTH };
}

// ---- Deleting files after a save ----

// Every asset id the saved theme still points at: in its design, its default invitation and its share image.
export function referencedAssetIds(design: ThemeDesign, document: InvitationDocument, shareImageId: string | null): Set<string> {
    const ids = new Set<string>();
    const walk = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            if (typeof record.mediaId === 'string') ids.add(record.mediaId);
            Object.values(record).forEach(walk);
        }
    };
    walk(design);
    walk(document);
    if (shareImageId) ids.add(shareImageId);
    return ids;
}
