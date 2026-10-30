'use client';

import { useCallback, useEffect, useState } from 'react';

export const OUTREACH_GUIDE_STORAGE_KEY = 'storywall.admin.outreachGuideDismissed';

function readDismissed(): boolean {
    try {
        return window.localStorage.getItem(OUTREACH_GUIDE_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

// The "How this works" card shows until this browser dismisses it once.
// Hidden until mounted, so the server render and a returning visitor never flash it.
export function useOutreachGuide() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Storage is only readable after mount; reading it in render would mismatch the server HTML.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(!readDismissed());
    }, []);

    const dismiss = useCallback(() => {
        setVisible(false);
        try {
            window.localStorage.setItem(OUTREACH_GUIDE_STORAGE_KEY, '1');
        } catch {
            // Private mode: it shows again next time, which is fine.
        }
    }, []);

    return { visible, dismiss };
}
