'use client';

import { useCallback, useState } from 'react';

// Which block's dropdown is open in feed edit mode: one at a time.
export function useFeedOpenMenu() {
    const [openId, setOpenId] = useState<string | null>(null);
    const setOpen = useCallback((id: string, open: boolean) => setOpenId((current) => (open ? id : current === id ? null : current)), []);
    const close = useCallback(() => setOpenId(null), []);

    return { openId, setOpen, close };
}
