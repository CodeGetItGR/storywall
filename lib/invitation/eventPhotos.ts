import type { MediaResponseDto } from '@/lib/api/types';
import type { ImageRef } from '@/lib/invitation/primitives';

// Picking the event's own photos for an invitation's gallery (KAN-84). The invitation keeps a reference, never a
// copy, so a photo deleted or removed on the event drops out of the page.

export type EventPhoto = { mediaId: string; url: string };

// The photos a host can pick: ready images of the event, newest first, as the gallery lists them.
export function eventPhotoChoices(media: readonly MediaResponseDto[]): EventPhoto[] {
    return media
        .filter((item) => item.mediaType === 'IMAGE' && item.status === 'READY' && !item.deletedAt)
        .map((item) => ({ mediaId: item.id, url: item.thumbnailUrl ?? item.mediaUrl ?? '' }))
        .filter((item) => item.url !== '');
}

// The event photos an image list already holds, by id.
export function pickedEventPhotoIds(images: readonly ImageRef[]): string[] {
    return images.flatMap((image) => (image.source === 'event' ? [image.mediaId] : []));
}

// Tapping a photo adds it at the end, or takes it out; nothing is added past the limit.
export function toggleEventPhoto(selected: readonly string[], mediaId: string, limit: number): string[] {
    if (selected.includes(mediaId)) return selected.filter((id) => id !== mediaId);
    return selected.length >= limit ? [...selected] : [...selected, mediaId];
}

export function eventPhotoRef(mediaId: string): ImageRef {
    return { source: 'event', mediaId };
}
