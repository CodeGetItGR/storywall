'use client';

import { useCallback } from 'react';

import { FeedBlockButtons } from '@/components/feed/edit/FeedBlockButtons';

type FeedEditBlockButtonsProps = {
    sectionId: string;
    color: string;
    uploading: boolean;
    onPhoto: (sectionId: string, file: File) => Promise<void>;
    onColor: (sectionId: string, color: string) => void;
};

// One Save my date block's picture and droplet, bound to that block.
export function FeedEditBlockButtons({ sectionId, color, uploading, onPhoto, onColor }: FeedEditBlockButtonsProps) {
    const photo = useCallback((file: File) => void onPhoto(sectionId, file), [onPhoto, sectionId]);
    const paint = useCallback((next: string) => onColor(sectionId, next), [onColor, sectionId]);
    return <FeedBlockButtons color={color} uploading={uploading} onPhoto={photo} onColor={paint} />;
}
