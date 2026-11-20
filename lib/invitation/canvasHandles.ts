import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationElement } from '@/lib/invitation/elements';
import type { InvitationSection } from '@/lib/invitation/sections';

// The rules of the editor's drag handles, ported from the old editor
// (save-my-date public/legacy editor-core-runtime.js, media-runtime.js and
// section-settings-runtime.js): the sizes each drag gives and the edits it makes.

type DocumentDraft = Draft<InvitationDocument>;

export type HandleLimits = { min: number; max: number };

// Section height: a text section keeps 40px more than its content, split as padding
// of at least 20px above and below. A photo has no padding and stops at 150px.
export const SECTION_CONTENT_GAP = 40;
export const SECTION_MIN_PADDING = 20;
export const PHOTO_MIN_HEIGHT = 150;
// The document's own bounds (sectionStyle.ts).
export const SECTION_HEIGHT_MAX = 3000;
const SECTION_PADDING_MAX = 1000;
export const SECTION_HEIGHT_FLOOR = 44;

export const SPACER_HEIGHT: HandleLimits = { min: 8, max: 600 };
export const ELEMENT_WIDTH: HandleLimits = { min: 40, max: 600 };
export const DECORATION_WIDTH: HandleLimits = { min: 60, max: 339 };
export const FRAME_SCALE: HandleLimits = { min: 0.5, max: 1.8 };
// Negative space lets a text overlap the one next to it a little.
export const TEXT_SPACING: HandleLimits = { min: -60, max: 120 };

export function clampTo(value: number, limits: HandleLimits): number {
    return Math.min(limits.max, Math.max(limits.min, value));
}

export type SectionSize = { minHeight: number; paddingY?: number };

// The size a section gets when its height bar is dragged `delta` px from `startHeight`.
export function draggedSectionSize(type: InvitationSection['type'], startHeight: number, contentHeight: number, delta: number): SectionSize {
    const wanted = Math.round(startHeight + delta);
    if (type === 'photo') {
        return { minHeight: Math.min(SECTION_HEIGHT_MAX, Math.max(PHOTO_MIN_HEIGHT, wanted)) };
    }
    const minimum = Math.ceil(contentHeight) + SECTION_CONTENT_GAP;
    const next = Math.min(SECTION_HEIGHT_MAX, Math.max(minimum, SECTION_HEIGHT_FLOOR, wanted));
    const paddingY = Math.min(SECTION_PADDING_MAX, Math.max(SECTION_MIN_PADDING, Math.floor((next - contentHeight) / 2)));
    return { minHeight: next, paddingY };
}

function findSection(draft: DocumentDraft, sectionId: string) {
    return draft.sections.find((section) => section.id === sectionId);
}

export function setSectionSize(draft: DocumentDraft, sectionId: string, size: SectionSize) {
    const section = findSection(draft, sectionId);
    if (!section) return;
    section.style.minHeight = size.minHeight;
    if (size.paddingY !== undefined) section.style.paddingY = size.paddingY;
}

// Back to the height of the content (the old double click on the bar).
export function resetSectionSize(draft: DocumentDraft, sectionId: string) {
    const section = findSection(draft, sectionId);
    if (!section) return;
    delete section.style.minHeight;
    delete section.style.paddingY;
}

export function hasSavedSize(section: Pick<InvitationSection, 'style'>): boolean {
    return section.style.minHeight !== undefined || section.style.paddingY !== undefined;
}

// The elements with a size handle, and the size each one keeps.
export type SizedElement = Extract<InvitationElement, { kind: 'spacer' | 'image' | 'photoFrame' }>;

export function isSizedElement(element: InvitationElement): element is SizedElement {
    return element.kind === 'spacer' || element.kind === 'image' || element.kind === 'photoFrame';
}

export function elementSize(element: SizedElement): number {
    switch (element.kind) {
        case 'spacer':
            return element.height;
        case 'image':
            return element.width;
        case 'photoFrame':
            return element.boxScale;
    }
}

// A spacer grows with a downward drag; an image with a drag to the right.
export function draggedLength(start: number, delta: number, limits: HandleLimits): number {
    return clampTo(Math.round(start + delta), limits);
}

// A photo frame scales by whichever way the pointer moved most, relative to the
// frame's size, so diagonal, sideways and vertical drags all feel the same.
export function draggedFrameScale(start: number, dx: number, dy: number, width: number, height: number): number {
    const nx = dx / Math.max(1, width);
    const ny = dy / Math.max(1, height);
    const delta = Math.abs(nx) >= Math.abs(ny) ? nx : ny;
    return clampTo(Math.round(start * (1 + delta) * 100) / 100, FRAME_SCALE);
}

export function setElementSize(draft: DocumentDraft, elementId: string, size: number) {
    for (const section of draft.sections) {
        const element = section.elements.find((item) => item.id === elementId);
        if (!element) continue;
        if (element.kind === 'spacer') element.height = clampTo(size, SPACER_HEIGHT);
        else if (element.kind === 'image') element.width = clampTo(size, ELEMENT_WIDTH);
        else if (element.kind === 'photoFrame') element.boxScale = clampTo(size, FRAME_SCALE);
        return;
    }
}

export function setDecorationWidth(draft: DocumentDraft, sectionId: string, width: number) {
    const section = findSection(draft, sectionId);
    if (!section) return;
    const data = section.data as { decoration?: { width: number } };
    if (data.decoration) data.decoration.width = clampTo(width, DECORATION_WIDTH);
}

export type MoveDirection = -1 | 1;
export type MoveOptions = { canBack: boolean; canForward: boolean };

const isFullWidth = (element: InvitationElement) => element.kind === 'text' && element.fullWidth === true;

// The items an item may swap with. Full-width items keep to their own row above the
// columns; the rest move through the column order and may cross the column break.
function itemLane(elements: readonly InvitationElement[], item: InvitationElement): number[] {
    const full = isFullWidth(item);
    return elements.flatMap((element, index) => {
        const inLane = element.kind === 'columnBreak' ? !full : isFullWidth(element) === full;
        return inLane ? [index] : [];
    });
}

// Moving the break moves one item between the columns. Full-width items stay put.
function breakLane(elements: readonly InvitationElement[]): number[] {
    return elements.flatMap((element, index) => (isFullWidth(element) ? [] : [index]));
}

function laneOptions(elements: readonly InvitationElement[], lane: number[], id: string): MoveOptions {
    const position = lane.findIndex((index) => elements[index].id === id);
    return { canBack: position > 0, canForward: position >= 0 && position < lane.length - 1 };
}

function swapInLane(elements: InvitationElement[], lane: number[], id: string, direction: MoveDirection) {
    const position = lane.findIndex((index) => elements[index].id === id);
    const target = position + direction;
    if (position < 0 || target < 0 || target >= lane.length) return;
    const a = lane[position];
    const b = lane[target];
    [elements[a], elements[b]] = [elements[b], elements[a]];
}

// Whether a custom section item shows its arrows at all: only when it has something to swap with.
export function customItemMoves(elements: readonly InvitationElement[], itemId: string): MoveOptions | null {
    const item = elements.find((element) => element.id === itemId);
    if (!item || item.kind === 'columnBreak') return null;
    const lane = itemLane(elements, item);
    return lane.length > 1 ? laneOptions(elements, lane, itemId) : null;
}

export function columnBreakMoves(elements: readonly InvitationElement[], breakId: string): MoveOptions {
    return laneOptions(elements, breakLane(elements), breakId);
}

function customElements(draft: DocumentDraft, sectionId: string): InvitationElement[] | undefined {
    const section = findSection(draft, sectionId);
    return section?.type === 'blank' ? (section.elements as InvitationElement[]) : undefined;
}

export function moveCustomItem(draft: DocumentDraft, sectionId: string, itemId: string, direction: MoveDirection) {
    const elements = customElements(draft, sectionId);
    const item = elements?.find((element) => element.id === itemId);
    if (!elements || !item || item.kind === 'columnBreak') return;
    swapInLane(elements, itemLane(elements, item), itemId, direction);
}

export function moveColumnBreak(draft: DocumentDraft, sectionId: string, breakId: string, direction: MoveDirection) {
    const elements = customElements(draft, sectionId);
    if (!elements?.some((element) => element.id === breakId && element.kind === 'columnBreak')) return;
    swapInLane(elements, breakLane(elements), breakId, direction);
}
