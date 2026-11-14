import { useEffect, useState } from 'react';

// How long an upload runs before we tell the uploader their connection is slow.
// Browsers on iPhone can't report network speed, so elapsed time is the signal.
export const SLOW_UPLOAD_DELAY_MS = 8000;

// true once `active` has stayed true for `delayMs`; false again as soon as it
// turns false, so the next upload starts fresh.
export function useSlowUpload(active: boolean, delayMs: number = SLOW_UPLOAD_DELAY_MS): boolean {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (!active) return;
        const timeout = window.setTimeout(() => setSlow(true), delayMs);
        return () => {
            window.clearTimeout(timeout);
            setSlow(false);
        };
    }, [active, delayMs]);

    return active && slow;
}
