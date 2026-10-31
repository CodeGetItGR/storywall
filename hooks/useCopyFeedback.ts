'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COPIED_MS = 1500;

// Copies one of several values and remembers which, so only that button says "Copied".
export function useCopyFeedback() {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const timer = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timer.current) window.clearTimeout(timer.current);
        },
        [],
    );

    const copy = useCallback(async (key: string, text: string) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedKey(null), COPIED_MS);
    }, []);

    return { copiedKey, copy };
}
