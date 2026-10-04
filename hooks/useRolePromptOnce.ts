'use client';

import { useEffect } from 'react';

import { rolePromptStorageKey } from '@/lib/memberRoles';

// Opens the role sheet once per member on this device. The key is set before
// the prompt shows, so skipping and saving both count. No storage → no prompt.
export function useRolePromptOnce({ active, memberId, onPromptAction }: { active: boolean; memberId: string | null; onPromptAction: () => void }) {
    useEffect(() => {
        if (!active || !memberId) return;
        const key = rolePromptStorageKey(memberId);
        try {
            if (window.localStorage.getItem(key)) return;
            window.localStorage.setItem(key, '1');
        } catch {
            return;
        }
        onPromptAction();
    }, [active, memberId, onPromptAction]);
}
