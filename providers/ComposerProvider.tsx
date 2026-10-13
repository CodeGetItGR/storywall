'use client';

import { lazy, type ReactNode, Suspense } from 'react';

import { useComposerController } from '@/hooks/useComposerController';
import { useDeferredMount } from '@/hooks/useDeferredMount';
import { useGuidelinesAcceptanceBlocking } from '@/hooks/useGuidelinesAcceptanceBlocking';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';
import { PublishQueueProvider } from '@/providers/PublishQueueProvider';

const ComposerModals = lazy(() => import('@/components/composer/ComposerModals').then((module) => ({ default: module.ComposerModals })));

function ComposerProviderInner({ children }: { children: ReactNode }) {
    const controller = useComposerController();
    const { contextValue, storyComposer } = controller;
    // The guidelines gate replaces only the page (children). The modals sit beside
    // it, so they're left out while it's up; their drafts live in the controller
    // and come back once the guidelines are accepted.
    const { isBlocking: isGuidelinesGateUp } = useGuidelinesAcceptanceBlocking();
    // The modals' code loads once the browser is idle on a page where this member can post,
    // or straight away when a composer opens before that.
    const shouldMountModals = useDeferredMount({ likely: contextValue.canCompose, needed: controller.isOpen || storyComposer.isOpen });

    return (
        <ComposerContext.Provider value={contextValue}>
            {children}
            {!isGuidelinesGateUp && shouldMountModals && (
                <Suspense fallback={null}>
                    <ComposerModals controller={controller} />
                </Suspense>
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
