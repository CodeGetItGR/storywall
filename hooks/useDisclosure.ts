'use client';

import { useCallback, useState } from 'react';

// An open/closed flag for a section the user can show and hide, such as a
// plan card's feature list on mobile.
export function useDisclosure(defaultOpen = false) {
    const [open, setOpen] = useState(defaultOpen);
    const toggle = useCallback(() => setOpen((current) => !current), []);
    // Idempotent, unlike toggle: safe from an async callback that may land after the user closed it.
    const close = useCallback(() => setOpen(false), []);

    return { open, toggle, close };
}
