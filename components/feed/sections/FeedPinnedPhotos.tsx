'use client';

import { MediaViewer } from '@/components/feed/post/MediaViewer';
import { FeedPinnedSection } from '@/components/feed/sections/FeedPinnedSection';
import { useFeedPinnedViewer } from '@/hooks/useFeedPinnedViewer';
import type { PinnedPhoto } from '@/lib/feedPinned';
import type { MediaResolver } from '@/lib/invitation/render';

// Pinned photos on the member page: a tap opens the photo in the viewer post photos use.
export function FeedPinnedPhotos({ photos, media }: { photos: readonly PinnedPhoto[]; media: MediaResolver }) {
    const viewer = useFeedPinnedViewer(photos, media);

    return (
        <>
            {/* Photos */}
            <FeedPinnedSection photos={photos} media={media} onOpen={viewer.open} />

            {/* Full screen */}
            {viewer.index !== null && (
                <MediaViewer items={viewer.items} index={viewer.index} onIndexChange={viewer.open} onCloseAction={viewer.close} />
            )}
        </>
    );
}
