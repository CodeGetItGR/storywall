'use client';

import { useCallback, useState } from 'react';

import type { FeedBackgroundKind } from '@/lib/feedBlockMenu';
import type { FeedAddKind, FeedAddPlace } from '@/lib/feedEditing';

// The section whose background sheet is open, and which one.
export type FeedBackgroundPanel = { id: string; kind: FeedBackgroundKind };

// Edit mode shows one settings surface at a time: the theme sheet, one block's settings or background, or the Add
// section sheet.
export function useFeedEditPanels(
    openSettingsFor: (id: string) => void,
    closeSettings: () => void,
    openAddSection: (kind: FeedAddKind, at?: FeedAddPlace) => void,
) {
    const [themeOpen, setThemeOpen] = useState(false);
    const [background, setBackground] = useState<FeedBackgroundPanel | null>(null);
    const closeBackground = useCallback(() => setBackground(null), []);
    const openTheme = useCallback(() => {
        closeSettings();
        setBackground(null);
        setThemeOpen(true);
    }, [closeSettings]);
    const closeTheme = useCallback(() => setThemeOpen(false), []);
    const openSettings = useCallback(
        (id: string) => {
            setThemeOpen(false);
            setBackground(null);
            openSettingsFor(id);
        },
        [openSettingsFor],
    );
    const openBackground = useCallback(
        (id: string, kind: FeedBackgroundKind) => {
            setThemeOpen(false);
            closeSettings();
            setBackground({ id, kind });
        },
        [closeSettings],
    );
    // The Add sheet is modal: it never opens over the theme sheet or a block's settings or background.
    const closeOthers = useCallback(() => {
        setThemeOpen(false);
        setBackground(null);
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

    return { themeOpen, openTheme, closeTheme, openSettings, background, openBackground, closeBackground, openAdd, openAddFeed, closeAll: closeOthers };
}
