import type { InvitationLabels } from '@/lib/invitation/labels';
import { type PhotoFrameElement, resolveFrameArt, resolvePhotoFrame } from '@/lib/invitation/photoFrame';
import { type RenderContext, resolveImage } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

export type GalleryData = Extract<InvitationSection, { type: 'gallery' }>['data'];
export type GalleryLayout = GalleryData['layout'];
export type GalleryShape = GalleryData['shape'];

export type GalleryImage = { src: string; alt: string };

// The carousel has its own markup; the other layouts are a list of cells.
export type GalleryCellLayout = Exclude<GalleryLayout, 'carousel'>;

const GRID_CLASS: Record<GalleryCellLayout, string> = {
    grid: 'wedart-gallery-grid',
    masonry: 'wedart-gallery-masonry',
    featured: 'wedart-gallery-featured',
};

export function galleryGridClass(layout: GalleryCellLayout): string {
    return GRID_CLASS[layout];
}

export function galleryPhotoAlt(position: number, total: number, labels: InvitationLabels): string {
    return labels.galleryPhotoAlt.replace('{n}', String(position)).replace('{total}', String(total));
}

export function galleryDotLabel(position: number, labels: InvitationLabels): string {
    return labels.galleryDot.replace('{n}', String(position));
}

// The photos guests can see, numbered among themselves. A photo whose file is
// gone is left out, so "Photo 2 of 2" stays true.
export function galleryImages(data: GalleryData, ctx: RenderContext): GalleryImage[] {
    const sources = data.images.flatMap((image) => resolveImage(image, ctx) ?? []);
    return sources.map((src, index) => ({ src, alt: galleryPhotoAlt(index + 1, sources.length, ctx.labels) }));
}

// Moves through the photos, going round at either end.
export function stepGalleryIndex(index: number, direction: 1 | -1, count: number): number {
    if (count === 0) return 0;
    return (index + direction + count) % count;
}

// A photo or gallery section with nothing to show renders nothing for guests,
// even with its own texts: the old page's "no photos" text was never meant for
// them. So does a frame section whose frames all have nothing to show; one with
// no elements at all is a plain band on the old page too, so it stays. The
// editor shows an empty photo, frame or gallery, with its camera, so the host can fill it.
export function isEmptyForGuests(section: InvitationSection, ctx: RenderContext): boolean {
    if (section.type === 'gallery') return !ctx.canvasTools?.gallery && galleryImages(section.data, ctx).length === 0;
    if (section.type === 'photo') return !ctx.canvasTools?.photo && !resolveImage(section.data.photo, ctx);
    if (section.type === 'photoFrame' || section.type === 'blank') {
        const { elements } = section;
        return elements.length > 0 && elements.every((element) => element.kind === 'photoFrame' && !isFrameShown(element, ctx));
    }
    return false;
}

// What PhotoFrame draws: guests a frame with its photo; the editor an empty frame
// with its camera too, and admins a frame not chosen yet.
function isFrameShown(element: PhotoFrameElement, ctx: RenderContext): boolean {
    if (ctx.canvasTools?.frameSettings) return true;
    if (ctx.canvasTools?.photo) return resolveFrameArt(element, ctx) !== null;
    return resolvePhotoFrame(element, ctx) !== null;
}
