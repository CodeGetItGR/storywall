'use client';

import { useCallback, useEffect, useState } from 'react';

type Scoped = { text: string; eventId: string; vendorId: string | null };

// A message that belongs to one event and photographer: it reads as null once either changes, with no reset effect.
// With autoClearMs the message also goes away by itself, and the clock restarts when it is set anew.
export function useScopedMessage(eventId: string, vendorId: string | null, autoClearMs?: number) {
    const [message, setMessage] = useState<Scoped | null>(null);

    useEffect(() => {
        if (!message || !autoClearMs) return;
        const timer = setTimeout(() => setMessage(null), autoClearMs);
        return () => clearTimeout(timer);
    }, [message, autoClearMs]);

    const set = useCallback((text: string | null) => setMessage(text === null ? null : { text, eventId, vendorId }), [eventId, vendorId]);
    const text = message && message.eventId === eventId && message.vendorId === vendorId ? message.text : null;
    return { text, set };
}
