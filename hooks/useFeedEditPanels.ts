'use client';

import { useCallback, useState } from 'react';

import type { FeedAddKind, FeedAddPlace } from '@/lib/feedEditing';

// Edit mode shows one settings surface at a time: the theme sheet, one block's settings, or the Add section sheet.
export function useFeedEditPanels(
    openSettingsFor: (id: string) => void,
    closeSettings: () => void,
    openAddSection: (kind: FeedAddKind, at?: FeedAddPlace) => void,
) {
    const [themeOpen, setThemeOpen] = useState(false);
    const openTheme = useCallback(() => {
        closeSettings();
        setThemeOpen(true);
    }, [closeSettings]);
    const closeTheme = useCallback(() => setThemeOpen(false), []);
    const openSettings = useCallback(
        (id: string) => {
            setThemeOpen(false);
            openSettingsFor(id);
        },
        [openSettingsFor],
    );
    // The Add sheet is modal: it never opens over the theme sheet or a block's settings.
    const closeOthers = useCallback(() => {
        setThemeOpen(false);
        closeSettings();
    }, [closeSettings]);
    const openAdd = useCallback(
        (at: FeedAddPlace) => {
            closeOthers();
            openAddSection('invitation', at);
        },
        [closeOthers, openAddSection],
    );
    const openAddFeed = useCallback(() => {
        closeOthers();
        openAddSection('feed');
    }, [closeOthers, openAddSection]);

    return { themeOpen, openTheme, closeTheme, openSettings, openAdd, openAddFeed, closeAll: closeOthers };
}
