'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatOutreachHash, parseOutreachHash } from '@/lib/adminOutreachRouting';
import { pushPageEntry, replacePageUrl } from '@/lib/overlayHistory';

function currentProspectId(): string | null {
    return typeof window === 'undefined' ? null : parseOutreachHash(window.location.hash);
}

function announceHashChange() {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// The open business lives in the hash (`#outreach/<id>`), so a link opens it and Back closes it.
// `shownId` outlives `selectedId` until the drawer has slid out, so it never empties mid-animation.
export function useOutreachSelection() {
    const [selectedId, setSelectedId] = useState<string | null>(currentProspectId);
    const [shownId, setShownId] = useState<string | null>(selectedId);
    // True when we pushed the drawer's entry, so closing can step Back instead of stacking another.
    const pushedRef = useRef(false);

    useEffect(() => {
        function syncFromHash() {
            const id = currentProspectId();
            setSelectedId(id);
            if (id) setShownId(id);
            else pushedRef.current = false;
        }
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const openProspect = useCallback((id: string) => {
        pushedRef.current = true;
        pushPageEntry(formatOutreachHash(id));
        announceHashChange();
    }, []);

    const closeProspect = useCallback(() => {
        if (pushedRef.current) {
            pushedRef.current = false;
            window.history.back();
            return;
        }
        // Opened from a link: nothing of ours to step back over.
        replacePageUrl(formatOutreachHash(null));
        announceHashChange();
    }, []);

    const handleClosed = useCallback(() => setShownId(currentProspectId()), []);

    return { selectedId, shownId, openProspect, closeProspect, handleClosed };
}
