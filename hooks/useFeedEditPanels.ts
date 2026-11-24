'use client';

import { useCallback, useState } from 'react';

import type { FeedAddPlace } from '@/lib/feedEditing';

// Edit mode shows one settings surface at a time: the theme sheet, one block's settings, or the Add section sheet.
export function useFeedEditPanels(openSettingsFor: (id: string) => void, closeSettings: () => void, openAddSection: (at: FeedAddPlace) => void) {
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
    const openAdd = useCallback(
        (at: FeedAddPlace) => {
            setThemeOpen(false);
            closeSettings();
            openAddSection(at);
        },
        [closeSettings, openAddSection],
    );

    return { themeOpen, openTheme, closeTheme, openSettings, openAdd };
}
