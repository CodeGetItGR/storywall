'use client';

import { useEffect } from 'react';

import { useMobileChromeActions } from '@/providers/MobileChromeProvider';

export function useHideComposerFab(reason: string) {
    const { hideComposerFab, showComposerFab } = useMobileChromeActions();

    useEffect(() => {
        hideComposerFab(reason);
        return () => showComposerFab(reason);
    }, [hideComposerFab, reason, showComposerFab]);
}
