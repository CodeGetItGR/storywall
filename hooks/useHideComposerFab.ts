'use client';

import { useEffect } from 'react';

import { useMobileChrome } from '@/providers/MobileChromeProvider';

export function useHideComposerFab(reason: string) {
    const { hideComposerFab, showComposerFab } = useMobileChrome();

    useEffect(() => {
        hideComposerFab(reason);
        return () => showComposerFab(reason);
    }, [hideComposerFab, reason, showComposerFab]);
}
