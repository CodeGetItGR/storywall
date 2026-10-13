'use client';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { PostMediaPreviewModal } from '@/components/composer/PostMediaPreviewModal';
import { StoryComposerModal } from '@/components/composer/StoryComposerModal';
import type { ComposerController } from '@/hooks/useComposerController';

// Loaded on demand by ComposerProvider, so a page doesn't ship the composers up front.
export function ComposerModals({ controller }: { controller: ComposerController }) {
    return (
        <>
            {/* Post and song composer */}
            <ComposerModal {...controller} />

            {/* Media preview */}
            <PostMediaPreviewModal controller={controller} />

            {/* Story composer */}
            <StoryComposerModal controller={controller.storyComposer} />
        </>
    );
}
