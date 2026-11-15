import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import { FRAME_ANIMATIONS } from '@/lib/invitation/elements';
import type { PhotoFrameElement } from '@/lib/invitation/photoFrame';

// The editor's rules for moving and zooming a photo, ported from the old editor
// (save-my-date public/legacy media-runtime.js): the framed photo pans in both
// directions and zooms 1x to 3x; the photo band only moves up and down.

type DocumentDraft = Draft<InvitationDocument>;

export type FrameAnimation = (typeof FRAME_ANIMATIONS)[number];

export const FRAME_ZOOM = { min: 1, max: 3, step: 0.15 } as const;
// One arrow key press moves the photo this many points of its 0 to 100 position.
export const POSITION_KEY_STEP = 5;

export type PhotoPosition = { imageX: number; imageY: number };
type Box = { width: number; height: number };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

export function clampFrameZoom(value: number): number {
    return Math.min(FRAME_ZOOM.max, Math.max(FRAME_ZOOM.min, round2(value)));
}

// A drag across 60% of the box (at least 60px) goes from one edge of the photo to the other.
function dragRange(size: number): number {
    return Math.max(60, size * 0.6);
}

// Where a framed photo is after a drag of `delta` px from `start`: it follows the pointer.
export function pannedPosition(start: PhotoPosition, delta: { x: number; y: number }, box: Box): PhotoPosition {
    return {
        imageX: Math.round(clampPercent(start.imageX + (delta.x / dragRange(box.width)) * 100)),
        imageY: Math.round(clampPercent(start.imageY + (delta.y / dragRange(box.height)) * 100)),
    };
}

// The photo band's position after a drag of `deltaY` px: dragging down shows more of the top.
export function draggedBandPosition(startY: number, deltaY: number, height: number): number {
    return Math.round(clampPercent(startY - (deltaY / dragRange(height)) * 100));
}

export function steppedPercent(value: number, amount: number): number {
    return Math.round(clampPercent(value + amount));
}

function findFrame(draft: DocumentDraft, elementId: string): Draft<PhotoFrameElement> | null {
    for (const section of draft.sections) {
        const element = section.elements.find((item) => item.id === elementId);
        if (element?.kind === 'photoFrame') return element;
    }
    return null;
}

export function setFramePosition(draft: DocumentDraft, elementId: string, position: PhotoPosition) {
    const frame = findFrame(draft, elementId);
    if (!frame) return;
    frame.imageX = clampPercent(position.imageX);
    frame.imageY = clampPercent(position.imageY);
}

export function setFrameZoom(draft: DocumentDraft, elementId: string, zoom: number) {
    const frame = findFrame(draft, elementId);
    if (frame) frame.zoom = clampFrameZoom(zoom);
}

// Admins only: which of the theme's frames, and how it comes in.
export function setFrameId(draft: DocumentDraft, elementId: string, frameId: string) {
    const frame = findFrame(draft, elementId);
    if (frame) frame.frameId = frameId;
}

export function setFrameAnimation(draft: DocumentDraft, elementId: string, animation: FrameAnimation) {
    const frame = findFrame(draft, elementId);
    if (frame) frame.animation = animation;
}

export function setPhotoBandPosition(draft: DocumentDraft, sectionId: string, imageY: number) {
    const section = draft.sections.find((item) => item.id === sectionId);
    if (section?.type === 'photo') section.data.imageY = clampPercent(imageY);
}

export function isFrameAnimation(value: string): value is FrameAnimation {
    return (FRAME_ANIMATIONS as readonly string[]).includes(value);
}
