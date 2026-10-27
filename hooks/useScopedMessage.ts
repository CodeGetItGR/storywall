'use client';

import { useCallback, useEffect, useState } from 'react';

type Scoped = { text: string; scope: string };

// A message that belongs to one scope (an event and photographer, say). Once the scope changes it is cleared,
// so it does not come back when the scope does. With autoClearMs it also goes away by itself;
// the clock restarts when it is set anew.
export function useScopedMessage(scope: string, autoClearMs?: number) {
    const [message, setMessage] = useState<Scoped | null>(null);

    useEffect(() => {
        if (!message || !autoClearMs) return;
        const timer = setTimeout(() => setMessage(null), autoClearMs);
        return () => clearTimeout(timer);
    }, [message, autoClearMs]);

    // Forget a message from another scope during render, as useGalleryScreen does for its report dialog.
    if (message && message.scope !== scope) setMessage(null);

    const set = useCallback((text: string | null) => setMessage(text === null ? null : { text, scope }), [scope]);
    return { text: message && message.scope === scope ? message.text : null, set };
}
