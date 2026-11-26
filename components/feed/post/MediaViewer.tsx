'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback } from 'react';

import { PostMediaCarousel, type ViewerMedia } from '@/components/feed/post/PostMediaCarousel';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { cn } from '@/lib/utils';

interface MediaViewerProps {
    items: readonly ViewerMedia[];
    // The item on screen.
    index: number;
    onIndexChange: (index: number) => void;
    onCloseAction: () => void;
    // What sits under the media: a post's caption, author and engagement.
    children?: ReactNode;
}

// The full-screen viewer: a post's photos and videos, or Pinned photos.
export function MediaViewer({ items, index, onIndexChange, onCloseAction, children }: MediaViewerProps) {
    const t = useTranslations('PostModal');
    const { requestClose } = useOverlayHistory(true, onCloseAction);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) requestClose();
        },
        [requestClose],
    );

    return (
        <Dialog.Root open onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                {/* Fullscreen media backdrop */}
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black data-closed:pointer-events-none" />

                {/* Fullscreen media viewer */}
                <Dialog.Popup aria-label={items[index]?.alt} className="fixed inset-0 z-50 bg-black outline-none">
                    <Dialog.Close
                        aria-label={t('close')}
                        className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                    >
                        <X className="h-6 w-6" />
                    </Dialog.Close>
                    <PostMediaCarousel media={items} initialIndex={index} onIndexChange={onIndexChange} />

                    {/* Position, and what the caller puts under the media */}
                    <div className={cn('absolute inset-x-0 bottom-0 z-10 flex flex-col items-center', !children && 'pb-4')}>
                        {items.length > 1 && (
                            <div className="mb-2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white tabular-nums">
                                {index + 1} / {items.length}
                            </div>
                        )}
                        {children}
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
