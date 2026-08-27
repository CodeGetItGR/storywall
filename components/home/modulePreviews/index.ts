import type { ComponentType } from 'react';

import { GalleryPreview } from '@/components/home/modulePreviews/GalleryPreview';
import { PlaylistPreview } from '@/components/home/modulePreviews/PlaylistPreview';
import { PostsPreview } from '@/components/home/modulePreviews/PostsPreview';
import type { ModulePreviewProps } from '@/components/home/modulePreviews/previewFrame';
import { RsvpPreview } from '@/components/home/modulePreviews/RsvpPreview';
import { StoriesPreview } from '@/components/home/modulePreviews/StoriesPreview';
import { WishbookPreview } from '@/components/home/modulePreviews/WishbookPreview';
import { WishlistPreview } from '@/components/home/modulePreviews/WishlistPreview';

export type { ModulePreviewProps, ModulePreviewVariant } from '@/components/home/modulePreviews/previewFrame';

/** Module keys that have a screen replica, in the order the showcase presents them. */
export const PREVIEWABLE_MODULE_KEYS = ['posts', 'stories', 'gallery', 'playlist', 'rsvp', 'wishlist', 'wishbook'] as const;

export const modulePreviews: Record<string, ComponentType<ModulePreviewProps>> = {
    posts: PostsPreview,
    stories: StoriesPreview,
    gallery: GalleryPreview,
    playlist: PlaylistPreview,
    rsvp: RsvpPreview,
    wishlist: WishlistPreview,
    wishbook: WishbookPreview,
};
