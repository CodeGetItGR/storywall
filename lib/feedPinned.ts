import type { Draft } from 'immer';

import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import { FEED_PINNED_MAX_PHOTOS, type InvitationSection } from '@/lib/invitation/sections';

export type PinnedPhoto = { id: string; image: { source: 'media'; mediaId: string } };
export type ShownPinnedPhoto = { id: string; url: string };

// The photos Pinned photos draws, in order. One whose URL isn't known (its upload went) is left out.
export function shownPinnedPhotos(photos: readonly PinnedPhoto[], media: MediaResolver): ShownPinnedPhoto[] {
    return photos.flatMap((photo) => {
        const url = media(photo.image.mediaId);
        return url ? [{ id: photo.id, url }] : [];
    });
}

// The photos of a Pinned photos section, or none for any other section.
export function pinnedPhotos(section: InvitationSection): PinnedPhoto[] {
    return section.type === 'feedPinned' ? section.data.photos : [];
}

function pinnedData(draft: Draft<InvitationDocument>, id: string) {
    const section = draft.sections.find((item) => item.id === id);
    return section?.type === 'feedPinned' ? section.data : null;
}

// A new upload goes last; a full section (six) takes no more.
export function addPinnedPhoto(sectionId: string, photoId: string, mediaId: string) {
    return (draft: Draft<InvitationDocument>) => {
        const data = pinnedData(draft, sectionId);
        if (data && data.photos.length < FEED_PINNED_MAX_PHOTOS) data.photos.push({ id: photoId, image: { source: 'media', mediaId } });
    };
}

// A drag in the settings sheet: the dragged photo takes the place of the one it was dropped on.
export function movePinnedPhoto(sectionId: string, activeId: string, overId: string) {
    return (draft: Draft<InvitationDocument>) => {
        const data = pinnedData(draft, sectionId);
        if (!data) return;
        const from = data.photos.findIndex((photo) => photo.id === activeId);
        const to = data.photos.findIndex((photo) => photo.id === overId);
        if (from === -1 || to === -1 || from === to) return;
        const [moved] = data.photos.splice(from, 1);
        data.photos.splice(to, 0, moved);
    };
}

// Out of the section only: the upload stays with the event.
export function removePinnedPhoto(sectionId: string, photoId: string) {
    return (draft: Draft<InvitationDocument>) => {
        const data = pinnedData(draft, sectionId);
        if (data) data.photos = data.photos.filter((photo) => photo.id !== photoId);
    };
}
