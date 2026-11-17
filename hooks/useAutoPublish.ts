'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { replacePageUrl } from '@/lib/overlayHistory';

// routes.saveMyDateEditorPublish's flag.
export const AUTO_PUBLISH_PARAM = 'publish';

// Back from signing in or paying (routes.saveMyDateEditorPublish), the editor goes on to publish once
// the session is known. The flag leaves the address, so a reload doesn't publish again.
export function useAutoPublish(start: () => void) {
    const { isBootstrapping } = useAuth();
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current || isBootstrapping) return;
        handled.current = true;
        const url = new URL(window.location.href);
        if (url.searchParams.get(AUTO_PUBLISH_PARAM) !== '1') return;
        url.searchParams.delete(AUTO_PUBLISH_PARAM);
        replacePageUrl(`${url.pathname}${url.search}${url.hash}`);
        start();
    }, [isBootstrapping, start]);
}
