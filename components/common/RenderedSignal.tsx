'use client';

import { useLayoutEffect } from 'react';

// Placed inside a Suspense boundary next to lazy content: the boundary commits its children
// together, so this fires once that content is in the DOM.
export function RenderedSignal({ onRendered }: { onRendered: () => void }) {
    useLayoutEffect(() => {
        onRendered();
    }, [onRendered]);

    return null;
}
