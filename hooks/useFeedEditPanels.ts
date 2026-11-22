'use client';

import { useCallback, useState } from 'react';

// Edit mode shows one settings surface at a time: the theme sheet, or one block's settings.
export function useFeedEditPanels(openSettingsFor: (id: string) => void, closeSettings: () => void) {
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

    return { themeOpen, openTheme, closeTheme, openSettings };
}
