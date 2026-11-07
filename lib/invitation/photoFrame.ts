import type { InvitationElement } from '@/lib/invitation/elements';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';

export type PhotoFrameElement = Extract<InvitationElement, { kind: 'photoFrame' }>;

type FrameBox = { width: number; height: number };

// Base width of a frame on the page, before the host's resize.
const FRAME_BASE_WIDTH = 420;

export type PhotoFrameGeometry = {
    x: number;
    y: number;
    width: number;
    height: number;
    // Set when the photo's own size isn't saved: fill the frame without stretching it.
    preserveAspectRatio: 'none' | 'xMidYMid slice';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Where the photo sits inside the frame, in the frame's own units: big enough to
// cover it, then the host's zoom, then moved within what overflows.
export function photoFrameGeometry(element: PhotoFrameElement, box: FrameBox): PhotoFrameGeometry {
    const sized = element.imageWidth > 1 && element.imageHeight > 1;
    const zoom = Math.max(1, element.zoom);
    const coverScale = sized ? Math.max(box.width / element.imageWidth, box.height / element.imageHeight) : 1;
    const width = (sized ? element.imageWidth * coverScale : box.width) * zoom;
    const height = (sized ? element.imageHeight * coverScale : box.height) * zoom;
    const overflowX = Math.max(0, width - box.width);
    const overflowY = Math.max(0, height - box.height);

    return {
        x: (box.width - width) / 2 + ((clamp(element.imageX, 0, 100) - 50) / 50) * (overflowX / 2),
        y: (box.height - height) / 2 + ((clamp(element.imageY, 0, 100) - 50) / 50) * (overflowY / 2),
        width,
        height,
        preserveAspectRatio: sized ? 'none' : 'xMidYMid slice',
    };
}

export function photoFrameWidth(boxScale: number): string {
    return `min(${Math.round(FRAME_BASE_WIDTH * boxScale)}px, 100%)`;
}

// Everything a frame needs from the theme and the host. A frame with no art, no
// mask or no photo has nothing to show guests, so it resolves to nothing.
export function resolvePhotoFrame(element: PhotoFrameElement, ctx: RenderContext) {
    const frame = ctx.theme.frames.find((item) => item.id === element.frameId);
    if (!frame) return null;

    const photo = resolveImage(element.photo, ctx);
    const art = ctx.media(frame.art.mediaId);
    const mask = ctx.media(frame.mask.mediaId);
    if (!photo || !art || !mask) return null;

    return { name: frame.name, width: frame.width, height: frame.height, photo, art, mask };
}
