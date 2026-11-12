import { arrayMove } from '@dnd-kit/sortable';

import type { GalleryLayout, GalleryShape } from '@/lib/invitation/gallery';
import { imageKey } from '@/lib/invitation/photoSlots';
import type { ImageRef } from '@/lib/invitation/primitives';
import { type DocumentRecipe, editSectionData } from '@/lib/invitation/sectionSettings';

// The gallery's photos in the editor (old gallery panel): delete, reorder, layout and shape.

// The shape is chosen only where the cells keep one: the mosaic and the slideshow show each photo as it is.
export function galleryHasShape(layout: GalleryLayout): boolean {
    return layout === 'grid' || layout === 'featured';
}

// A steady id for each photo, for the drag and the list keys: the photo itself,
// and how many times it came before, since one photo can be in a gallery twice.
export function galleryPhotoIds(images: readonly ImageRef[]): string[] {
    const seen = new Map<string, number>();
    return images.map((image) => {
        const base = imageKey(image);
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        return `${base}#${count}`;
    });
}

// Deletes the photo at one place, if the place is still there.
export function deleteGalleryPhoto(sectionId: string, index: number): DocumentRecipe {
    return editSectionData(sectionId, 'gallery', (data) => {
        if (index >= 0 && index < data.images.length) data.images.splice(index, 1);
    });
}

export function moveGalleryPhoto(sectionId: string, from: number, to: number): DocumentRecipe {
    return editSectionData(sectionId, 'gallery', (data) => {
        const { length } = data.images;
        if (from === to || from < 0 || to < 0 || from >= length || to >= length) return;
        data.images = arrayMove(data.images, from, to);
    });
}

export function setGalleryLayout(sectionId: string, layout: GalleryLayout): DocumentRecipe {
    return editSectionData(sectionId, 'gallery', (data) => {
        data.layout = layout;
    });
}

export function setGalleryShape(sectionId: string, shape: GalleryShape): DocumentRecipe {
    return editSectionData(sectionId, 'gallery', (data) => {
        data.shape = shape;
    });
}
