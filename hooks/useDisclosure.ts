'use client';

import { useCallback, useState } from 'react';

// An open/closed flag for a section the user can show and hide, such as a
// plan card's feature list on mobile.
export function useDisclosure(defaultOpen = false) {
    const [open, setOpen] = useState(defaultOpen);
    const toggle = useCallback(() => setOpen((current) => !current), []);

    return { open, toggle };
}
