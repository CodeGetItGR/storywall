'use client';

import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { PostMediaPreviewModal } from '@/components/composer/PostMediaPreviewModal';
import { StoryComposerModal } from '@/components/composer/StoryComposerModal';
import { useComposerController } from '@/hooks/useComposerController';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';

export function ComposerProvider({ children }: { children: ReactNode }) {
    const controller = useComposerController();
    const { contextValue, storyComposer } = controller;

    return (
        <ComposerContext.Provider value={contextValue}>
            {children}
            <ComposerModal {...controller} />
            <PostMediaPreviewModal controller={controller} />
            <StoryComposerModal controller={storyComposer} />
        </ComposerContext.Provider>
    );
}

export { useComposer };
