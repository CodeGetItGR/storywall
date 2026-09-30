'use client';

import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { PostMediaPreviewModal } from '@/components/composer/PostMediaPreviewModal';
import { StoryComposerModal } from '@/components/composer/StoryComposerModal';
import { useComposerController } from '@/hooks/useComposerController';
import { useGuidelinesAcceptanceBlocking } from '@/hooks/useGuidelinesAcceptanceBlocking';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';
import { PublishQueueProvider } from '@/providers/PublishQueueProvider';

function ComposerProviderInner({ children }: { children: ReactNode }) {
    const controller = useComposerController();
    const { contextValue, storyComposer } = controller;
    // The guidelines gate replaces only the page (children). The modals sit beside
    // it, so they're left out while it's up; their drafts live in the controller
    // and come back once the guidelines are accepted.
    const { isBlocking: isGuidelinesGateUp } = useGuidelinesAcceptanceBlocking();

    return (
        <ComposerContext.Provider value={contextValue}>
            {children}
            {!isGuidelinesGateUp && (
                <>
                    <ComposerModal {...controller} />
                    <PostMediaPreviewModal controller={controller} />
                    <StoryComposerModal controller={storyComposer} />
                </>
            )}
        </ComposerContext.Provider>
    );
}

export function ComposerProvider({ children }: { children: ReactNode }) {
    return (
        <PublishQueueProvider>
            <ComposerProviderInner>{children}</ComposerProviderInner>
        </PublishQueueProvider>
    );
}

export { useComposer };
