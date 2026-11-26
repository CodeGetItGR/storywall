'use client';

import { useMemo, useState } from 'react';

import { MediaViewer } from '@/components/feed/post/MediaViewer';
import { PostMediaViewerInfo } from '@/components/feed/post/PostMediaViewerInfo';
import { useRecordProMediaView } from '@/hooks/useContentViews';
import type { MediaResponseDto, PostResponseDto } from '@/lib/api/types';

interface PostMediaViewerProps {
    post: PostResponseDto;
    media: MediaResponseDto[];
    initialIndex: number;
    alt: string;
    onCloseAction: () => void;
}

export function PostMediaViewer({ post, media, initialIndex, alt, onCloseAction }: PostMediaViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const items = useMemo(() => media.map((item) => ({ ...item, alt })), [alt, media]);
    // A Pro item on screen counts as one view for its vendor (sneak peek, 2026-10-29).
    useRecordProMediaView(media[currentIndex]);

    return (
        <MediaViewer items={items} index={currentIndex} onIndexChange={setCurrentIndex} onCloseAction={onCloseAction}>
            <PostMediaViewerInfo post={post} />
        </MediaViewer>
    );
}
