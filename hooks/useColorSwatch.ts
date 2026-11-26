'use client';

import { useCallback, useState } from 'react';

// A colour field's popover of circles: it closes once a colour is picked.
export function useColorSwatch() {
    const [isOpen, setIsOpen] = useState(false);
    const close = useCallback(() => setIsOpen(false), []);

    return { isOpen, onOpenChange: setIsOpen, close };
}
