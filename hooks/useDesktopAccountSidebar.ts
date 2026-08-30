'use client';

import { useCallback, useState } from 'react';

export function useDesktopAccountSidebar() {
    const [hovered, setHovered] = useState(false);
    const [pinned, setPinned] = useState(false);
    const expanded = hovered || pinned;

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
