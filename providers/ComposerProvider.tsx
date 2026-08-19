'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { useComposerController } from '@/hooks/useComposerController';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';

export function ComposerProvider({ children }: { children: ReactNode }) {
    const controller = useComposerController();
    const { contextValue, storyInputRef, handleStoryFileChange } = controller;
    const t = useTranslations('ComposerCard');

    return (
        <ComposerContext.Provider value={contextValue}>
            {children}
            <ComposerModal {...controller} />
            <input
                ref={storyInputRef}
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={handleStoryFileChange}
                aria-label={t('addStory')}
                tabIndex={-1}
            />
        </ComposerContext.Provider>
    );
}

export { useComposer };
