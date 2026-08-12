'use client';

import { createContext, useContext } from 'react';

export interface ComposerContextValue {
    openPostComposer: () => void;
    openSongComposer: () => void;
    openStoryCapture: () => void;
    isCreatingStory: boolean;
    storyError: string | null;
    canCompose: boolean;
    canComposePost: boolean;
    canComposeStory: boolean;
    canComposeSong: boolean;
}

export const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useComposer(): ComposerContextValue {
    const context = useContext(ComposerContext);
    if (!context) {
        throw new Error('useComposer must be used within a ComposerProvider');
    }
    return context;
}
