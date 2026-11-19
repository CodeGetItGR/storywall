'use client';

import { createContext, useContext } from 'react';

export interface ComposerContextValue {
    openPostComposer: () => void;
    openPostImagePicker: () => void;
    openSongComposer: () => void;
    openAnnouncementComposer: () => void;
    openStoryCapture: () => void;
    canCompose: boolean;
    canComposePost: boolean;
    canComposeStory: boolean;
    canComposeSong: boolean;
    // Hosts and planners: the composer's Announcement mode.
    canAnnounce: boolean;
}

export const ComposerContext = createContext<ComposerContextValue | null>(null);

export function useComposer(): ComposerContextValue {
    const context = useContext(ComposerContext);
    if (!context) {
        throw new Error('useComposer must be used within a ComposerProvider');
    }
    return context;
}
