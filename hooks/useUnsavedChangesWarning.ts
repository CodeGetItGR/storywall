'use client';

import { useEffect } from 'react';

// Asks the browser to confirm closing, reloading or leaving the site while active.
// The browser writes the question itself.
export function useUnsavedChangesWarning(active: boolean) {
    useEffect(() => {
        if (!active) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Older browsers only ask when this is set.
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [active]);
}
