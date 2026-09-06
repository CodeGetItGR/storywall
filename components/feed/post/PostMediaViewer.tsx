'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { PostMediaCarousel } from '@/components/feed/post/PostMediaCarousel';
import { PostMediaViewerInfo } from '@/components/feed/post/PostMediaViewerInfo';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import type { MediaResponseDto, PostResponseDto } from '@/lib/api/types';

interface PostMediaViewerProps {
    post: PostResponseDto;
    media: MediaResponseDto[];
    initialIndex: number;
    alt: string;
    onCloseAction: () => void;
}

export function PostMediaViewer({ post, media, initialIndex, alt, onCloseAction }: PostMediaViewerProps) {
    const t = useTranslations('PostModal');
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { requestClose } = useOverlayHistory(true, onCloseAction);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) requestClose();
        },
        [requestClose]
    );

    return (
        <Dialog.Root open onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                {/* Fullscreen media backdrop */}
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black data-closed:pointer-events-none" />

                {/* Fullscreen media viewer */}
                <Dialog.Popup aria-label={alt} className="fixed inset-0 z-50 bg-black outline-none">
                    <Dialog.Close
                        aria-label={t('close')}
                        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                    >
                        <X className="h-6 w-6" />
                    </Dialog.Close>
                    <PostMediaCarousel media={media} initialIndex={currentIndex} onIndexChange={setCurrentIndex} alt={alt} />

                    {/* Caption, author, and engagement overlay */}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center">
                        {media.length > 1 && (
                            <div className="mb-2 rounded-full bg-black/50 px-2.5 py-1 text-xs tabular-nums text-white">
                                {currentIndex + 1} / {media.length}
                            </div>
                        )}
                        <PostMediaViewerInfo post={post} />
                    </div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
