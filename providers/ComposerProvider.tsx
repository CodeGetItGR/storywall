'use client';

import type { ReactNode } from 'react';

import { ComposerModal } from '@/components/composer/ComposerModal';
import { useComposerController } from '@/hooks/useComposerController';
import { ComposerContext, useComposer } from '@/providers/composer/ComposerContext';

export function ComposerProvider({ children }: { children: ReactNode }) {
    const controller = useComposerController();

    return (
        <ComposerContext.Provider value={controller.contextValue}>
            {children}
            <ComposerModal {...controller} />
        </ComposerContext.Provider>
    );
}

export { useComposer };
