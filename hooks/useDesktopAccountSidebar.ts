'use client';

import { useCallback, useState } from 'react';

import { useRegisterOverlayPresence } from '@/hooks/useOverlayPresence';

export function useDesktopAccountSidebar() {
    const [hovered, setHovered] = useState(false);
    const [pinned, setPinned] = useState(false);
    const expanded = hovered || pinned;

    // The wide rail counts as an open overlay so the composer FAB steps aside.
    useRegisterOverlayPresence(expanded);

    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);
    const togglePinned = useCallback(() => setPinned((current) => !current), []);

    return {
        expanded,
        pinned,
        handleMouseEnter,
        handleMouseLeave,
        togglePinned,
    };
}
