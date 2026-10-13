'use client';

import { getImageProps } from 'next/image';
import { useEffect } from 'react';
import { preload } from 'react-dom';

import type { StoryResponseDto } from '@/lib/api/types';
import { STORY_IMAGE_SIZES } from '@/lib/stories';

// Fetches a photo story's image ahead of time (the next one in the viewer), the same file next/image
// will ask for, so it shows at once instead of waiting on the network. Videos aren't preloaded.
export function useStoryImagePreload(story: StoryResponseDto | null): void {
    const media = story?.media;
    const src = media && media.mediaType !== 'VIDEO' ? media.mediaUrl : null;

    useEffect(() => {
        if (!src) return;
        const { props } = getImageProps({ src, alt: '', fill: true, sizes: STORY_IMAGE_SIZES });
        preload(props.src, { as: 'image', imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: 'low' });
    }, [src]);
}
