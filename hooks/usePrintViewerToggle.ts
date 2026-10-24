'use client';

import { useCallback } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useScopedMessage } from '@/hooks/useScopedMessage';
import type { MediaResponseDto, PrintListItemDto } from '@/lib/api/types';
import { isPrintable } from '@/lib/printPicks';

type ViewerToggleInput = {
    eventId: string;
    vendorId: string | null;
    available: boolean;
    viewerMedia: MediaResponseDto | null;
    items: PrintListItemDto[];
    add: (mediaIds: string[], skipped: number) => Promise<string | null>;
    removeAsync: (itemId: string) => Promise<unknown>;
    pending: boolean;
};

// The viewer's pick button: adds the open photo, or takes it off. It keeps its own error so none shows behind the open viewer.
export function usePrintViewerToggle({ eventId, vendorId, available, viewerMedia, items, add, removeAsync, pending }: ViewerToggleInput) {
    const toErrorMessage = useApiErrorMessage();
    const error = useScopedMessage(eventId, vendorId);
    const { set: setError } = error;
    const viewerItem = viewerMedia ? items.find((item) => item.mediaId === viewerMedia.id && !item.removed) : undefined;
    const viewerId = viewerMedia?.id ?? null;
    const viewerItemId = viewerItem?.id ?? null;

    const onToggle = useCallback(async () => {
        if (!viewerId) return;
        setError(null);
        if (viewerItemId) {
            try {
                await removeAsync(viewerItemId);
            } catch (removeError) {
                setError(toErrorMessage(removeError));
            }
            return;
        }
        setError(await add([viewerId], 0));
    }, [add, removeAsync, setError, toErrorMessage, viewerId, viewerItemId]);

    // Only on photos, while print picks are available.
    if (!available || !viewerMedia || !isPrintable(viewerMedia)) return null;
    return { picked: Boolean(viewerItem), pending, error: error.text, onToggle };
}
