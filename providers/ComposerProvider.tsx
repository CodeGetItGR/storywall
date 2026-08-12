'use client';

import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';
import { useComposerController } from '@/hooks/useComposerController';

export function ComposerProvider({ children }: { children: ReactNode }) {
    const controller = useComposerController();

    return (
        <ComposerContext.Provider value={controller.contextValue}>
            {children}
            <ComposerModal controller={controller} />
        </ComposerContext.Provider>
    );
}

export { useComposer };
