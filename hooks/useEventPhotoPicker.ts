'use client';

import { useCallback, useMemo } from 'react';

import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { useEventMedia } from '@/hooks/useMedia';
import { eventPhotoChoices, toggleEventPhoto } from '@/lib/invitation/eventPhotos';

type EventPhotoPickerOptions = {
    eventId: string | null;
    selectedIds: readonly string[];
    limit: number;
    // The gallery's other photos (the host's uploads), which count toward the limit too.
    taken: number;
    onChange: (mediaIds: string[]) => void;
};

// The event's photos for the picker, which ones are picked, and the next page as the list scrolls.
export function useEventPhotoPicker({ eventId, selectedIds, limit, taken, onChange }: EventPhotoPickerOptions) {
    const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useEventMedia(eventId);
    const photos = useMemo(() => eventPhotoChoices(data?.pages.flatMap((page) => page.content) ?? []), [data]);
    const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
    const sentinel = useInfiniteScrollSentinel(hasNextPage, loadMore, photos.length, isFetchingNextPage);

    // How many event photos fit next to the gallery's own.
    const room = Math.max(0, limit - taken);
    const toggle = useCallback((mediaId: string) => onChange(toggleEventPhoto(selectedIds, mediaId, room)), [room, onChange, selectedIds]);
    const isPicked = useCallback((mediaId: string) => selectedIds.includes(mediaId), [selectedIds]);
    const isFull = selectedIds.length >= room;

    return { photos, isLoading, isEmpty: !isLoading && photos.length === 0, sentinel, toggle, isPicked, isFull };
}
