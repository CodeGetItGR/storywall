'use client';

import { useCallback, useState } from 'react';

// Whether the feed's folded Invitation row is open. Every visit starts closed; nothing is stored.
export function useInvitationFold() {
    const [open, setOpen] = useState(false);
    const toggle = useCallback(() => setOpen((current) => !current), []);
    return { open, toggle };
}
