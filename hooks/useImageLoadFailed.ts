'use client';

import { useCallback, useState } from 'react';

// Whether the image at `src` failed to load. A new `src` starts over, so a
// changed picture gets its own try.
export function useImageLoadFailed(src: string | null | undefined) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const handleError = useCallback(() => setFailedSrc(src ?? null), [src]);

    return { failed: Boolean(src) && failedSrc === src, handleError };
}
