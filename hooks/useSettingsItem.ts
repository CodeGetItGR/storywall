'use client';

import { useCallback, useState } from 'react';

// The one item of a list whose settings are open. It closes by itself when
// the item goes away (deleted, or an undo took it back).
export function useSettingsItem<T extends { id: string }>(items: readonly T[]) {
    const [openId, setOpenId] = useState<string | null>(null);
    const item = items.find((entry) => entry.id === openId) ?? null;

    const open = useCallback((id: string) => setOpenId(id), []);
    const close = useCallback(() => setOpenId(null), []);

    return { item, open, close };
}
