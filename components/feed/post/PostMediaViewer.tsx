'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { PostMediaCarousel } from '@/components/feed/post/PostMediaCarousel';
import type { MediaResponseDto } from '@/lib/api/types';

interface PostMediaViewerProps {
    media: MediaResponseDto[];
    initialIndex: number;
    alt: string;
    onCloseAction: () => void;
}

export function PostMediaViewer({ media, initialIndex, alt, onCloseAction }: PostMediaViewerProps) {
    const t = useTranslations('PostModal');
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) onCloseAction();
        },
        [onCloseAction]
    );

    return (
        <Dialog.Root open onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                {/* Fullscreen media backdrop */}
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black" />

                {/* Fullscreen media viewer */}
                <Dialog.Popup aria-label={alt} className="fixed inset-0 z-50 bg-black outline-none">
                    <Dialog.Close
                        aria-label={t('close')}
                        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
                    >
                        <X className="h-6 w-6" />
                    </Dialog.Close>
                    <PostMediaCarousel media={media} initialIndex={currentIndex} onIndexChange={setCurrentIndex} alt={alt} />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
