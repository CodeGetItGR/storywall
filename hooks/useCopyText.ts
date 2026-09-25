'use client';

import { useState } from 'react';

export function useCopyText(text: string) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }

    return { copied, copy };
}
